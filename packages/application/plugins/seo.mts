import { execFile } from 'node:child_process'
import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import { glob } from 'tinyglobby'

import { resolveRouteSeo } from '@rooted/adapter'

import { injectCanonical, injectHeadLinks, injectMetaTags, injectOgTags, injectRootJsonLd } from './seo-html.mts'
import { buildSitemapIndexXml, buildSitemapXml } from './seo-sitemap.mts'

import type { LlmsTxtOptions } from './llms-txt.mts'
import type { RobotsOptions } from './robots.mts'
import type { AdditionalSitemap, RouteHeadLinkProvider, RouteHtmlTransform, SeoApi, SeoPrepareTask, SitemapEntry } from '@rooted/adapter'
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
	 * @default undefined - generates a default robots.txt
	 */
	robots?: RobotsOptions | false
	/**
	 * Options for the generated `llms.txt`. Set to `false` to disable
	 * `llms.txt` generation entirely.
	 * @default undefined - generates a default llms.txt from named static routes
	 */
	llmsTxt?: LlmsTxtOptions | false
}

/**
 * SEO plugin. Generates `sitemap.xml` (and a `sitemap-index.xml` when additional
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
	const headLinkProviders: RouteHeadLinkProvider[] = []
	const htmlTransforms: RouteHtmlTransform[] = []
	const prepareTasks: SeoPrepareTask[] = []
	let prepared: Promise<void> | undefined

	function prepare(): Promise<void> {
		return prepared ??= (async () => {
			for (const task of prepareTasks) await task()
		})()
	}

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
				let result = injectMetaTags(html, seo, toLocation(staticPath), defaultOgImage, titleSuffix)
				const links = headLinkProviders.flatMap(provider => provider(staticPath) ?? [])
				if (links.length > 0) {
					result = injectHeadLinks(result, links.map(link => ({ rel: link.rel, hreflang: link.hreflang, href: toLocation(link.path) })))
				}
				for (const transform of htmlTransforms) result = transform(result, staticPath)
				return result
			},
			injectRootHtml(html: string): string {
				let result = injectRootJsonLd(html, webManifest, deploymentUrl)
				result = injectCanonical(result, toLocation('/'))
				result = injectOgTags(result, undefined, toLocation('/'), defaultOgImage)
				return result
			},
			addRouteHeadLinks(provider: RouteHeadLinkProvider): void {
				headLinkProviders.push(provider)
			},
			addRouteHtmlTransform(transform: RouteHtmlTransform): void {
				htmlTransforms.push(transform)
			},
			addPrepareTask(task: SeoPrepareTask): void {
				prepareTasks.push(task)
			},
			prepare,
		} satisfies SeoApi,

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(p => p.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
		},

		async closeBundle() {
			await prepare()

			const outputDirectory = config.build.outDir
			const today = new Date().toISOString().slice(0, 10)

			const homeGlobs = options?.homeRouteFiles ?? DEFAULT_HOME_ROUTE_FILES
			const homeFiles = await glob(homeGlobs, { cwd: config.root, absolute: true })
			const homeDates = await Promise.all(homeFiles.map((f: string) => gitLastModified(f, config.root)))
			const homeLastModified = homeDates.toSorted().at(-1)

			const entries = await buildSitemapEntries(manifestApi, homeLastModified, toLocation, config.root)

			if (entries.size > 0) {
				await writeFile(
					path.join(outputDirectory, 'sitemap.xml'),
					buildSitemapXml([...entries.values()]),
					'utf8',
				)
			}

			if (additionalSitemaps.size > 0) {
				await writeAdditionalSitemaps(outputDirectory, additionalSitemaps, entries, toLocation, today)
			}
		},
	}
}

async function buildSitemapEntries(
	manifestApi: RouteManifestApi | undefined,
	homeLastModified: string | undefined,
	toLocation: (path: string) => string,
	root: string,
): Promise<Map<string, SitemapEntry>> {
	const entries = new Map<string, SitemapEntry>()

	if (homeLastModified !== undefined) {
		const loc = toLocation('/')
		entries.set(loc, { loc, lastmod: homeLastModified })
	}

	if (manifestApi) {
		for (const route of manifestApi.routes) {
			if (!Object.hasOwn(route, 'getMetadata')) continue
			const metadata = route.getMetadata()
			// staticPaths includes constant-token routes unrolled to concrete paths
			const staticPaths = metadata.staticPaths
			if (staticPaths === false) continue

			const sourceFile = manifestApi.routeSourceFiles.get(route)
			const lastmod = await gitLastModified(sourceFile, root)

			for (const staticPath of staticPaths) {
				const loc = toLocation(staticPath)
				if (entries.has(loc)) continue

				// Lazy seo resolvers are evaluated per generated page
				const seo = await resolveRouteSeo(route, staticPath)
				if (seo?.excludeFromSitemap) continue

				entries.set(loc, {
					loc,
					lastmod,
					changeFrequency: seo?.changeFrequency,
					priority: seo?.priority,
				})
			}
		}
	}

	return entries
}

async function writeAdditionalSitemaps(
	outputDirectory: string,
	additionalSitemaps: Map<string, AdditionalSitemap>,
	entries: Map<string, SitemapEntry>,
	toLocation: (path: string) => string,
	today: string,
): Promise<void> {
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
			// not a git repo or file untracked, fall through to stat
		}
	}

	const fileStat = filePath ? await stat(filePath) : undefined
	return (fileStat?.mtime ?? new Date()).toISOString().slice(0, 10)
}
