import { execFile } from 'node:child_process'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import { glob } from 'tinyglobby'

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
}

/**
 * SEO plugin — generates a `sitemap.xml` from all static routes discovered by
 * {@link generateRouteManifest}, plus a root entry whose `lastmod` is the
 * newest git commit date across the configured home route files.
 *
 * Also injects per-page meta tags (`<title>`, description, canonical,
 * Open Graph) into each static route's `index.html` copy, and adds a
 * JSON-LD `WebSite` schema block to the root `index.html`.
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

	return {
		name: 'rooted:seo',
		apply: 'build',

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(p => p.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
		},

		async closeBundle() {
			function toLocation(staticPath: string): string {
				return deploymentUrl
					? new URL(staticPath.slice(1), deploymentUrl).href
					: config.base + staticPath.slice(1)
			}

			const outputDirectory = config.build.outDir

			// Pass 1: find the newest git date among home/navigation files
			const homeGlobs = options?.homeRouteFiles ?? DEFAULT_HOME_ROUTE_FILES
			const homeFiles = await glob(homeGlobs, { cwd: config.root, absolute: true })
			const homeDates = await Promise.all(homeFiles.map((f: string) => gitLastModified(f, config.root)))
			const homeLastModified = homeDates.toSorted().at(-1)

			// Pass 2: build the full list of { loc, lastmod } entries
			type SitemapEntry = { loc: string, lastmod: string }
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
					entries.set(loc, { loc, lastmod })
				}
			}

			if (entries.size > 0) {
				// Pass 3: construct the sitemap XML and write the asset
				const xml = [
					`<?xml version="1.0" encoding="UTF-8"?>`,
					`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
					...[...entries.values()].map(({ loc, lastmod }) =>
						`\t<url>\n\t\t<loc>${loc}</loc>\n\t\t<lastmod>${lastmod}</lastmod>\n\t</url>`,
					),
					`</urlset>`,
				].join('\n')

				await writeFile(path.join(outputDirectory, 'sitemap.xml'), xml, 'utf8')
			}

			// Pass 4: inject meta tags into static route index.html copies
			const defaultOgImage = options?.defaultOgImage
				?? (deploymentUrl ? new URL('pwa-512x512.png', deploymentUrl).href : undefined)
			const titleSuffix = options?.titleSuffix

			// Inject into root index.html (JSON-LD WebSite schema + canonical)
			const rootHtmlPath = path.join(outputDirectory, 'index.html')
			try {
				let rootHtml = await readFile(rootHtmlPath, 'utf8')
				rootHtml = injectRootJsonLd(rootHtml, webManifest, deploymentUrl)
				rootHtml = injectCanonical(rootHtml, toLocation('/'))
				rootHtml = injectOgTags(rootHtml, undefined, toLocation('/'), defaultOgImage)
				await writeFile(rootHtmlPath, rootHtml, 'utf8')
			}
			catch {
				// root index.html may not exist in some build environments
			}

			// Inject into each static route's index.html copy
			if (manifestApi) {
				for (const route of manifestApi.routes) {
					if (!Object.hasOwn(route, 'getMetadata')) continue
					const metadata = route.getMetadata()
					const staticPath = metadata.staticRoute
					if (staticPath === false || staticPath === '/') continue

					const segments = staticPath.split('/').filter(Boolean)
					const htmlPath = path.join(outputDirectory, ...segments, 'index.html')

					try {
						let html = await readFile(htmlPath, 'utf8')
						const canonicalUrl = toLocation(staticPath)
						html = injectMetaTags(html, metadata.seo, canonicalUrl, defaultOgImage, titleSuffix)
						await writeFile(htmlPath, html, 'utf8')
					}
					catch {
						// file may not exist if githubPagesAdapter wasn't used
					}
				}
			}
		},
	}
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
