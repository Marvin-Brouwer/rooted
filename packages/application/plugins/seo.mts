import { execFile } from 'node:child_process'
import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import { glob } from 'tinyglobby'

import type { RobotsOptions } from './robots.mts'
import type { AdditionalSitemap, SeoApi, SitemapEntry } from './seo-api.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { RouteSeoMetadata } from '@rooted/router/routes'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ManifestOptions } from 'vite-plugin-pwa'

const execFileAsync = promisify(execFile)

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'

const DEFAULT_HOME_ROUTE_FILES = [
	'./src/navigation/application.mts',
	'./src/navigation/*.mts',
	'!./src/navigation/not-found.mts',
]

export type SeoOptions = {
	/**
	 * Glob patterns (relative to the Vite project root) used to discover
	 * home/navigation files. The newest `git log` date among all matched files
	 * is used as the `lastmod` for the root sitemap entry.
	 * Supports negation patterns (prefix with `!`).
	 * @default ['./src/navigation/application.mts', './src/navigation/*.mts', '!./src/navigation/not-found.mts']
	 */
	homeRouteFiles?: string[]
	/**
	 * Default `og:image` URL injected when a route has no `seo.image`.
	 * Falls back to `{deploymentUrl}pwa-512x512.png` when omitted.
	 */
	defaultOgImage?: string
	/**
	 * String appended to every injected `<title>`, e.g. `' | My App'`.
	 * Only applied when the route has a `seo.title`.
	 */
	titleSuffix?: string
	/**
	 * Options for the generated `robots.txt`. Set to `false` to disable
	 * robots.txt generation entirely.
	 * @default undefined — generates a default robots.txt
	 */
	robots?: RobotsOptions | false
}

/**
 * SEO plugin — generates `sitemap.xml` (and a `sitemap-index.xml` when additional
 * sitemaps are registered) from all static routes discovered by
 * {@link generateRouteManifest}, plus a root entry whose `lastmod` is the
 * newest git commit date across the configured home route files.
 *
 * HTML meta tag injection is the adapter's responsibility. The plugin exposes
 * {@link SeoApi} (`plugin.api`) so adapters and other plugins can:
 * - inject meta tags via `injectRouteHtml` / `injectRootHtml`
 * - register additional sitemaps via `addSitemap`
 *
 * Runs only during production builds. If no static routes are found at all,
 * nothing is written.
 *
 * Uses `git log` to determine per-file `lastmod`, falling back to `stat` mtime
 * when the file is not tracked.
 *
 * @internal Automatically included by {@link rootedManifest}. Configure via
 * `seo` in the manifest options.
 */
export function seoPlugin(
	deploymentUrl: string | undefined,
	webManifest: Partial<ManifestOptions> & { name?: string, description?: string },
	options: SeoOptions | undefined,
): Plugin {
	let config: ResolvedConfig
	let manifestApi: RouteManifestApi | undefined

	const additionalSitemaps = new Map<string, AdditionalSitemap>()

	const defaultOgImage = options?.defaultOgImage
		?? (deploymentUrl ? new URL('pwa-512x512.png', deploymentUrl).href : undefined)
	const titleSuffix = options?.titleSuffix

	function toLocation(staticPath: string): string {
		return deploymentUrl
			? new URL(staticPath.slice(1), deploymentUrl).href
			: config.base + staticPath.slice(1)
	}

	return {
		name: 'rooted:seo',
		apply: 'build',

		api: {
			addSitemap(sitemap: AdditionalSitemap): void {
				additionalSitemaps.set(sitemap.name, sitemap)
			},
			getSitemapUrl(): string | undefined {
				if (!deploymentUrl) return undefined
				const file = additionalSitemaps.size > 0 ? 'sitemap-index.xml' : 'sitemap.xml'
				return new URL(file, deploymentUrl).href
			},
			injectRouteHtml(html: string, seo: RouteSeoMetadata | undefined, staticPath: string): string {
				return injectMetaTags(html, seo, toLocation(staticPath), defaultOgImage, titleSuffix)
			},
			injectRootHtml(html: string): string {
				let result = injectRootJsonLd(html, webManifest, deploymentUrl)
				result = injectCanonical(result, toLocation('/'))
				result = injectOgTags(result, undefined, toLocation('/'), defaultOgImage)
				return result
			},
		} satisfies SeoApi,

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(p => p.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
		},

		async closeBundle() {
			const outputDirectory = config.build.outDir
			const today = new Date().toISOString().slice(0, 10)

			// Pass 1: find the newest git date among home/navigation files
			const homeGlobs = options?.homeRouteFiles ?? DEFAULT_HOME_ROUTE_FILES
			const homeFiles = await glob(homeGlobs, { cwd: config.root, absolute: true })
			const homeDates = await Promise.all(homeFiles.map((f: string) => gitLastModified(f, config.root)))
			const homeLastModified = homeDates.toSorted().at(-1)

			// Pass 2: build the full list of sitemap entries for static routes
			const entries = new Map<string, SitemapEntry>()

			if (homeLastModified !== undefined) {
				const loc = toLocation('/')
				entries.set(loc, { loc, lastmod: homeLastModified })
			}

			if (manifestApi) {
				for (const route of manifestApi.routes) {
					if (!Object.hasOwn(route, 'getMetadata')) continue
					const metadata = route.getMetadata()
					const staticPath = metadata.staticRoute
					if (staticPath === false) continue
					if (metadata.seo?.excludeFromSitemap) continue

					const loc = toLocation(staticPath)
					if (entries.has(loc)) continue

					const sourceFile = manifestApi.routeSourceFiles.get(route)
					const lastmod = await gitLastModified(sourceFile, config.root)
					entries.set(loc, {
						loc,
						lastmod,
						changeFrequency: metadata.seo?.changeFrequency,
						priority: metadata.seo?.priority,
					})
				}
			}

			if (entries.size > 0) {
				// Pass 3: write sitemap.xml
				await writeFile(
					path.join(outputDirectory, 'sitemap.xml'),
					buildSitemapXml([...entries.values()]),
					'utf8',
				)
			}

			// Pass 4: write additional sitemaps + sitemap-index when extras are registered
			if (additionalSitemaps.size > 0) {
				for (const sitemap of additionalSitemaps.values()) {
					await writeFile(
						path.join(outputDirectory, `sitemap-${sitemap.name}.xml`),
						buildSitemapXml(sitemap.entries),
						'utf8',
					)
				}

				const indexEntries = [
					...(entries.size > 0
						? [{ loc: toLocation('/sitemap.xml'), lastmod: [...entries.values()].map(entry => entry.lastmod ?? today).toSorted().at(-1) ?? today }]
						: []
					),
					...[...additionalSitemaps.values()].map(sitemap => ({
						loc: toLocation(`/sitemap-${sitemap.name}.xml`),
						lastmod: sitemap.entries.map(entry => entry.lastmod ?? today).toSorted().at(-1) ?? today,
					})),
				]

				await writeFile(
					path.join(outputDirectory, 'sitemap-index.xml'),
					buildSitemapIndexXml(indexEntries),
					'utf8',
				)
			}
		},
	}
}

// ---------------------------------------------------------------------------
// Sitemap XML builders
// ---------------------------------------------------------------------------

function buildSitemapXml(entries: SitemapEntry[]): string {
	const hasImages = entries.some(entry => entry.images && entry.images.length > 0)
	const namespace = hasImages
		? `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`
		: `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`

	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<urlset ${namespace}>`,
		...entries.map(entry => buildUrlElement(entry)),
		`</urlset>`,
	].join('\n')
}

function buildUrlElement({ loc, lastmod, changeFrequency, priority, images }: SitemapEntry): string {
	const imageLines = images?.flatMap(({ loc: imageLoc, title, caption }) => [
		`\t\t<image:image>`,
		`\t\t\t<image:loc>${imageLoc}</image:loc>`,
		...(title ? [`\t\t\t<image:title>${escapeHtml(title)}</image:title>`] : []),
		...(caption ? [`\t\t\t<image:caption>${escapeHtml(caption)}</image:caption>`] : []),
		`\t\t</image:image>`,
	]) ?? []

	return [
		`\t<url>`,
		`\t\t<loc>${loc}</loc>`,
		...(lastmod ? [`\t\t<lastmod>${lastmod}</lastmod>`] : []),
		...(changeFrequency ? [`\t\t<changefreq>${changeFrequency}</changefreq>`] : []),
		...(priority === undefined ? [] : [`\t\t<priority>${priority.toFixed(1)}</priority>`]),
		...imageLines,
		`\t</url>`,
	].join('\n')
}

function buildSitemapIndexXml(sitemaps: Array<{ loc: string, lastmod: string }>): string {
	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
		...sitemaps.map(({ loc, lastmod }) =>
			`\t<sitemap>\n\t\t<loc>${loc}</loc>\n\t\t<lastmod>${lastmod}</lastmod>\n\t</sitemap>`,
		),
		`</sitemapindex>`,
	].join('\n')
}

// ---------------------------------------------------------------------------
// HTML injection helpers
// ---------------------------------------------------------------------------

function injectMetaTags(
	html: string,
	seo: RouteSeoMetadata | undefined,
	canonicalUrl: string,
	defaultOgImage: string | undefined,
	titleSuffix: string | undefined,
): string {
	if (seo?.title) {
		const fullTitle = titleSuffix ? `${seo.title}${titleSuffix}` : seo.title
		html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`)
	}

	if (seo?.description) {
		html = replaceOrInsertMeta(html, 'name', 'description', seo.description)
	}

	if (seo?.noIndex) {
		html = insertBeforeHead(html, `\t<meta name="robots" content="noindex" />`)
	}

	html = injectCanonical(html, canonicalUrl)
	html = injectOgTags(html, seo, canonicalUrl, defaultOgImage)

	return html
}

function injectCanonical(html: string, canonicalUrl: string): string {
	if (/<link[^>]+rel=["']canonical["']/i.test(html)) return html
	return insertBeforeHead(html, `\t<link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />`)
}

function injectOgTags(
	html: string,
	seo: RouteSeoMetadata | undefined,
	canonicalUrl: string,
	defaultOgImage: string | undefined,
): string {
	const ogImage = seo?.image ?? defaultOgImage
	const tags: string[] = []

	if (seo?.title && !hasMeta(html, 'property', 'og:title'))
		tags.push(`\t<meta property="og:title" content="${escapeAttribute(seo.title)}" />`)
	if (seo?.description && !hasMeta(html, 'property', 'og:description'))
		tags.push(`\t<meta property="og:description" content="${escapeAttribute(seo.description)}" />`)
	if (!hasMeta(html, 'property', 'og:url'))
		tags.push(`\t<meta property="og:url" content="${escapeAttribute(canonicalUrl)}" />`)
	if (ogImage && !hasMeta(html, 'property', 'og:image'))
		tags.push(`\t<meta property="og:image" content="${escapeAttribute(ogImage)}" />`)
	if (!hasMeta(html, 'property', 'og:type'))
		tags.push(`\t<meta property="og:type" content="website" />`)

	if (tags.length === 0) return html
	return insertBeforeHead(html, tags.join('\n'))
}

function injectRootJsonLd(
	html: string,
	webManifest: Partial<ManifestOptions> & { name?: string, description?: string },
	deploymentUrl: string | undefined,
): string {
	if (html.includes('application/ld+json')) return html

	const schema: Record<string, string> = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
	}
	if (webManifest.name) schema['name'] = webManifest.name
	if (webManifest.description) schema['description'] = webManifest.description
	if (deploymentUrl) schema['url'] = deploymentUrl

	const jsonLd = JSON.stringify(schema, undefined, '\t\t')
	return insertBeforeHead(html, `\t<script type="application/ld+json">\n\t${jsonLd}\n\t</script>`)
}

function replaceOrInsertMeta(html: string, attribute: string, value: string, content: string): string {
	const pattern = new RegExp(`<meta[^>]+${attribute}=["']${value}["'][^>]*>`, 'i')
	const replacement = `<meta ${attribute}="${value}" content="${escapeAttribute(content)}" />`
	if (pattern.test(html)) return html.replace(pattern, replacement)
	return insertBeforeHead(html, `\t${replacement}`)
}

function hasMeta(html: string, attribute: string, value: string): boolean {
	return new RegExp(`<meta[^>]+${attribute}=["']${value}["']`, 'i').test(html)
}

function insertBeforeHead(html: string, snippet: string): string {
	return html.replace('</head>', `${snippet}\n</head>`)
}

function escapeHtml(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeAttribute(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}

// ---------------------------------------------------------------------------

async function gitLastModified(filePath: string | undefined, cwd: string): Promise<string> {
	if (filePath) {
		try {
			const { stdout } = await execFileAsync(
				'git', ['log', '-1', '--format=%aI', '--', filePath],
				{ cwd },
			)
			const iso = stdout.trim()
			if (iso) return new Date(iso).toISOString().slice(0, 10)
		}
		catch {
			// not a git repo or file untracked — fall through to stat
		}
	}

	const fileStat = filePath ? await stat(filePath) : undefined
	return (fileStat?.mtime ?? new Date()).toISOString().slice(0, 10)
}
