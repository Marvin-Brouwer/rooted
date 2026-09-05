import { gitLastModified } from './git-last-modified.mts'
import { routeManifestPluginName, seoPluginName } from './plugin-names.mts'
import { resolveRouteSeo } from './resolve-route-seo.mts'

import type { PageEntry, PageSeoMetadata, SeoApi } from './seo-api.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin } from 'vite'

/** Name this plugin registers under. */
export const routeSeoPluginName = 'rooted:route-seo'

/**
 * `@rooted/router` is an optional peer and every import of it here is
 * type-only, so nothing throws on its own when it isn't installed. This is the
 * only way to tell "no router" apart from "router installed but not in use".
 *
 * `import.meta.resolve`, not `createRequire().resolve()`: the latter applies
 * CommonJS conditions, and every `@rooted/*` package is ESM only, so it reports
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` even when the router is right there.
 */
function routerIsInstalled(): boolean {
	try {
		import.meta.resolve('@rooted/router/manifest')
		return true
	}
	catch {
		return false
	}
}

/**
 * Feeds route metadata to the `rooted:seo` plugin.
 *
 * Walks the route manifest once and registers three things: a prepare task that
 * resolves every static route's seo, a provider that hands that metadata to
 * `injectRouteHtml`, and a provider for the route entries in `sitemap.xml`. The
 * SEO plugin itself knows nothing about routing, which is why this is a
 * separate entry point.
 *
 * It does nothing in two cases. Without `@rooted/router` installed it warns
 * once, because you only get here by adding this plugin yourself, so a missing
 * peer is a mistake. With the router installed but no manifest plugin in the
 * config it stays quiet, because that's a normal setup.
 *
 * @example
 * ```ts
 * import { routeSeoPlugin } from '@rooted/seo/router'
 *
 * export default defineConfig({
 *   plugins: [generateRouteManifest({ ... }), routeSeoPlugin()],
 * })
 * ```
 *
 * Add it yourself. `rootedManifest` doesn't, because `@rooted/application`
 * knows nothing about routing, which is what keeps routing optional.
 */
export function routeSeoPlugin(): Plugin {
	const seoByPath = new Map<string, PageSeoMetadata | undefined>()
	let pages: PageEntry[] = []

	return {
		name: routeSeoPluginName,
		apply: 'build',

		configResolved(resolved) {
			if (!routerIsInstalled()) {
				resolved.logger.warn(`[${routeSeoPluginName}] @rooted/router is not installed, route SEO is disabled`)
				return
			}

			const manifestPlugin = resolved.plugins.find(p => p.name === routeManifestPluginName)
			const manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
			// No manifest plugin is a normal setup, so no warning here.
			if (!manifestApi) return

			const seoPlugin = resolved.plugins.find(p => p.name === seoPluginName)
			const seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
			if (!seoApi) return

			// A prepare task, not a lazy provider, because `injectRouteHtml` is
			// synchronous and resolving a lazy seo resolver is not. Everything that
			// injects html awaits `prepare()` first, so the map is filled by then.
			seoApi.addPrepareTask(async () => {
				pages = await walkRoutes(manifestApi, resolved.root, seoByPath)
			})
			seoApi.addRouteSeoProvider(staticPath => seoByPath.get(staticPath))
			seoApi.addPageProvider(async () => pages)
		},
	}
}

/**
 * Resolves the seo of every static path the manifest can produce, filling
 * `seoByPath` on the way so `injectRouteHtml` can look a page up later.
 */
async function walkRoutes(
	manifestApi: RouteManifestApi,
	root: string,
	seoByPath: Map<string, PageSeoMetadata | undefined>,
): Promise<PageEntry[]> {
	const pages: PageEntry[] = []

	for (const route of manifestApi.routes) {
		if (!Object.hasOwn(route, 'getMetadata')) continue
		const metadata = route.getMetadata()
		// staticPaths includes constant-token routes unrolled to concrete paths
		const staticPaths = metadata.staticPaths
		if (staticPaths === false) continue

		const sourceFile = manifestApi.routeSourceFiles.get(route)
		const lastmod = await gitLastModified(sourceFile, root)

		for (const staticPath of staticPaths) {
			if (seoByPath.has(staticPath)) continue

			// Lazy seo resolvers are evaluated per generated page
			const seo = await resolveRouteSeo(route, staticPath)
			seoByPath.set(staticPath, seo)

			// Every page, including the ones kept out of the sitemap: `llms.txt`
			// still lists those, so the flag travels with the page.
			pages.push({
				path: staticPath,
				lastmod,
				excludeFromSitemap: seo?.excludeFromSitemap,
				changeFrequency: seo?.changeFrequency,
				priority: seo?.priority,
			})
		}
	}

	return pages
}
