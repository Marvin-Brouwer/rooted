import { access, constants, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { routeManifestPluginName, seoPluginName } from '@rooted/seo'

import { resolveAdapterRoutes } from '../utility/adapter-routes.mts'

import { buildMiddlewareFiles } from './middleware-build.mts'

import type { InternalDefinition } from './create.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { SeoApi } from '@rooted/seo'
import type { Plugin, ResolvedConfig } from 'vite'

/**
 * The build-time half of every adapter: writes the fallback shell, the static route directories, `routes.json`,
 * and runs the SSG pre-render pass.
 *
 * Everything host-specific happens in the definition's `setup`, which runs once all of that is on disk.
 */
export function buildPlugin<TApplication>(definition: InternalDefinition<TApplication>): Plugin {
	let config: ResolvedConfig
	let manifestApi: RouteManifestApi | undefined
	let seoApi: SeoApi | undefined

	return {
		name: definition.name,
		apply: 'build',

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(p => p.name === routeManifestPluginName)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
			const seoPlugin = resolved.plugins.find(p => p.name === seoPluginName)
			seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
		},

		async closeBundle() {
			const outputDirectory = config.build.outDir
			const indexHtmlPath = path.join(outputDirectory, 'index.html')

			// Skip environments that don't produce index.html (e.g. the SW environment from VitePWA)
			if (!await checkFileExists(indexHtmlPath)) return
			const indexHtml = await readFile(indexHtmlPath, 'utf8')

			// Let plugins finish async work (e.g. preloading lazily imported
			// dictionaries) before any route seo is evaluated
			await seoApi?.prepare()

			const resolvedRoutes = resolveAdapterRoutes(manifestApi, definition.routes)

			if (!manifestApi && resolvedRoutes.staticPaths.length === 0 && resolvedRoutes.dynamicPatterns.length === 0) {
				throw new Error(
					`[${definition.name}] No routes found. Add generateRouteManifest() to your plugins, ` +
					`or pass a routes option to the adapter.`,
				)
			}

			const fallbackFileName = definition.fallbackFileName ?? '404.html'
			// Leave the fallback a plain shell so the JS router can handle any URL,
			// and capture it before root SEO is applied to index.html so crawlers
			// don't get root-page metadata for dynamic or unknown routes.
			await writeFile(path.join(outputDirectory, fallbackFileName), indexHtml, 'utf8')

			// A routing manifest, so the generated server knows which dynamic route
			// patterns exist, the base path, and which file to serve as the SPA
			// catch-all. `vite preview` reads the same file, which is why a static
			// adapter writes one too even though nothing deployed reads it.
			await writeFile(
				path.join(outputDirectory, 'routes.json'),
				JSON.stringify({
					base: config.base,
					staticRoutes: resolvedRoutes.staticPaths,
					dynamicRoutes: resolvedRoutes.dynamicPatterns,
					fallback: fallbackFileName,
					dynamicStatus: definition.dynamicRoutes === 'not-found' ? 404 : 200,
					...(definition.dynamicRoutes === 'catch-all' && { dynamicMatch: 'catch-all' }),
				}, undefined, 2),
				'utf8',
			)

			if (definition.middlewarePath) {
				await buildMiddlewareFiles({
					name: definition.name,
					middlewarePath: definition.middlewarePath,
					outputDirectory,
					config,
				})
			}

			await definition.setup?.({ outputDirectory, indexHtml, config, resolvedRoutes })

			// Inject root-level SEO (JSON-LD, canonical, og:url/type/image) into index.html
			const rootHtml = seoApi ? seoApi.injectRootHtml(indexHtml) : indexHtml
			if (rootHtml !== indexHtml) {
				await writeFile(indexHtmlPath, rootHtml, 'utf8')
			}

			// Route-level SEO goes on last, over whatever the page ended up as,
			// so it wins over the title and meta the app sets while rendering
			const withRouteSeo = (html: string, staticPath: string) => seoApi ? seoApi.injectRouteHtml(html, staticPath) : html

			const staticRoutes: Array<{ staticPath: string, htmlPath: string }> = []

			for (const staticPath of resolvedRoutes.staticPaths) {
				const segments = staticPath.split('/').filter(Boolean)
				if (segments.length === 0) continue

				const routeDirectory = path.join(outputDirectory, ...segments)
				await mkdir(routeDirectory, { recursive: true })

				// The plain shell stays as the page when pre-rendering is skipped or a route fails to render
				const htmlPath = path.join(routeDirectory, 'index.html')
				await writeFile(htmlPath, withRouteSeo(indexHtml, staticPath), 'utf8')
				staticRoutes.push({ staticPath, htmlPath })
			}

			// SSG pre-render pass -- boot the app once in happy-dom, navigate to each
			// static route, and write the whole rendered document over its shell.
			// Imported here so that loading an adapter, which every vite.config
			// using one does, doesn't drag happy-dom in with it (issue #291).
			const { renderer } = await import('@rooted/prerender')
			await renderer({ html: indexHtml, outputDirectory, base: config.base, logger: config.logger }, async render => {
				for (const { staticPath, htmlPath } of staticRoutes) {
					const rendered = await render(staticPath)
					if (!rendered) continue

					await writeFile(htmlPath, withRouteSeo(rendered, staticPath), 'utf8')
				}
			})
		},
	}
}

async function checkFileExists(filePath: string): Promise<boolean> {
	return await access(filePath, constants.F_OK)
		.then(() => true)
		.catch(() => false)
}
