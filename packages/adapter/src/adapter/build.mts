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
 * The build-time half of every adapter: writes the fallback shell, the static
 * route directories, `routes.json`, and runs the SSG pre-render pass.
 *
 * Everything host-specific happens in the definition's `setup`, which runs once
 * all of that is on disk.
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

			if (definition.mode === 'routed') {
				// Write a routing manifest so the server knows which dynamic route patterns
				// exist, the base path, and which file to serve as the SPA catch-all fallback.
				await writeFile(
					path.join(outputDirectory, 'routes.json'),
					JSON.stringify({ base: config.base, staticRoutes: resolvedRoutes.staticPaths, dynamicRoutes: resolvedRoutes.dynamicPatterns, fallback: fallbackFileName }, undefined, 2),
					'utf8',
				)
			}

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

			const staticRoutes: Array<{ staticPath: string, routeDirectory: string }> = []

			for (const staticPath of resolvedRoutes.staticPaths) {
				const segments = staticPath.split('/').filter(Boolean)
				if (segments.length === 0) continue

				const routeDirectory = path.join(outputDirectory, ...segments)
				await mkdir(routeDirectory, { recursive: true })

				const html = seoApi
					? seoApi.injectRouteHtml(indexHtml, staticPath)
					: indexHtml
				await writeFile(path.join(routeDirectory, 'index.html'), html, 'utf8')
				staticRoutes.push({ staticPath, routeDirectory })
			}

			// SSG pre-render pass -- boot the app once in happy-dom, navigate to each
			// static route, and inject the resulting body HTML into the shell files.
			// Imported here so that loading an adapter, which every vite.config
			// using one does, doesn't drag happy-dom in with it (issue #291).
			const { createStaticRenderer, injectSnapshot } = await import('../static-renderer.mts')
			const renderer = await createStaticRenderer(config, outputDirectory)
				.catch((error: unknown) => {
					config.logger.warn(`[static-renderer] Setup error: ${String(error)}`)
				})

			if (renderer) {
				for (const { staticPath, routeDirectory } of staticRoutes) {
					const snapshot = await renderer.render(staticPath)
					if (!snapshot) continue

					const htmlPath = path.join(routeDirectory, 'index.html')
					const html = await readFile(htmlPath, 'utf8')
					await writeFile(htmlPath, injectSnapshot(html, snapshot), 'utf8')
				}
				await renderer.dispose()
			}
		},
	}
}

async function checkFileExists(filePath: string): Promise<boolean> {
	return await access(filePath, constants.F_OK)
		.then(() => true)
		.catch(() => false)
}
