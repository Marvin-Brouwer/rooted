import { access, constants, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { createStaticRenderer, injectSnapshot } from '../static-renderer.mts'

import type { SeoApi } from '../seo-api.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin, ResolvedConfig } from 'vite'

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'
const SEO_PLUGIN_NAME = 'rooted:seo'

/**
 * GitHub Pages adapter plugin.
 *
 * After a production build:
 * - Writes `.nojekyll` and `404.html` (copy of `index.html`) so GitHub Pages
 *   serves the SPA for any URL that doesn't match a real file.
 * - For every static route discovered by {@link generateRouteManifest}, writes
 *   a `{route}/index.html` so direct URL loads land on the correct page.
 * - When the SEO plugin is present, injects per-page meta tags into each
 *   written `index.html` copy and injects the JSON-LD `WebSite` schema plus
 *   canonical tag into the root `index.html`.
 * - Pre-renders each static route's structural HTML into its `index.html` using
 *   a happy-dom window so crawlers and first paint see real content instead of
 *   an empty shell. The browser still boots the JS normally on top.
 *
 * Set `webManifest.url` in {@link rootedManifest} to configure the deployment
 * base path (e.g. `homepage` from `package.json`). That URL's pathname becomes
 * Vite's `base` automatically.
 *
 * Automatically connects to `generateRouteManifest` via Vite's inter-plugin
 * communication (`plugin.api`) — no manual wiring needed. If the manifest
 * plugin is absent, only `404.html` is written.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest, githubPagesAdapter } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     githubPagesAdapter(),
 *   ],
 *   webManifest: { id: 'my-app', url: packageJson.homepage },
 * })
 * ```
 */
export function githubPagesAdapter(): Plugin {
	let config: ResolvedConfig
	let manifestApi: RouteManifestApi | undefined
	let seoApi: SeoApi | undefined

	return {
		name: 'rooted:github-pages',
		apply: 'build',

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(p => p.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
			const seoPlugin = resolved.plugins.find(p => p.name === SEO_PLUGIN_NAME)
			seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
		},

		async closeBundle() {
			const outputDirectory = config.build.outDir
			const indexHtmlPath = path.join(outputDirectory, 'index.html')

			// Skip environments that don't produce index.html (e.g. the SW environment from VitePWA)
			if (!await checkFileExists(indexHtmlPath)) return
			const indexHtml = await readFile(indexHtmlPath, 'utf8')

			await writeFile(path.join(outputDirectory, '.nojekyll'), 'disable jekyll in this github pages directory', 'utf8')
			// 404.html handles dynamic routes — leave it as a plain shell so the JS router
			// can handle any URL. Never inject pre-rendered content here.
			await writeFile(path.join(outputDirectory, '404.html'), indexHtml, 'utf8')

			// Inject root-level SEO (JSON-LD, canonical, og:url/type/image) into index.html
			const rootHtml = seoApi ? seoApi.injectRootHtml(indexHtml) : indexHtml
			if (rootHtml !== indexHtml) {
				await writeFile(indexHtmlPath, rootHtml, 'utf8')
			}

			const staticRoutes: Array<{ staticPath: string, routeDirectory: string }> = []

			for (const route of manifestApi?.routes ?? []) {
				if (!Object.hasOwn(route, 'getMetadata')) continue

				const metadata = route.getMetadata()
				const staticPath = metadata.staticRoute
				if (staticPath === false) continue

				const segments = staticPath.split('/').filter(Boolean)
				if (segments.length === 0) continue

				const routeDirectory = path.join(outputDirectory, ...segments)
				await mkdir(routeDirectory, { recursive: true })

				const html = seoApi
					? seoApi.injectRouteHtml(indexHtml, metadata.seo, staticPath)
					: indexHtml
				await writeFile(path.join(routeDirectory, 'index.html'), html, 'utf8')
				staticRoutes.push({ staticPath, routeDirectory })
			}

			// SSG pre-render pass — boot the app once in happy-dom, navigate to each
			// static route, and inject the resulting body HTML into the shell files
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

async function checkFileExists(filePath: string) {
	return await access(filePath, constants.F_OK)
		.then(() => true)
		.catch(() => false)
}
