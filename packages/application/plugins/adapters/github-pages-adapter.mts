import { access, constants, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin, ResolvedConfig } from 'vite'

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'

/**
 * GitHub Pages adapter plugin.
 *
 * After a production build:
 * - Writes `.nojekyll` and `404.html` (copy of `index.html`) so GitHub Pages
 *   serves the SPA for any URL that doesn't match a real file.
 * - For every static route discovered by {@link generateRouteManifest}, writes
 *   a `{route}/index.html` so direct URL loads land on the correct page.
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

	return {
		name: 'rooted:github-pages',
		apply: 'build',

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(p => p.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
		},

		async closeBundle() {
			const outputDirectory = config.build.outDir
			const indexHtmlPath = path.join(outputDirectory, 'index.html')

			// Skip environments that don't produce index.html (e.g. the SW environment from VitePWA)
			if (!await checkFileExists(indexHtmlPath)) return
			const indexHtml = await readFile(indexHtmlPath, 'utf8')

			await writeFile(path.join(outputDirectory, '.nojekyll'), 'disable jekyll in this github pages directory', 'utf8')
			await writeFile(path.join(outputDirectory, '404.html'), indexHtml, 'utf8')

			for (const route of manifestApi?.routes ?? []) {
				if (!Object.hasOwn(route, 'getMetadata')) continue

				const staticPath = route.getMetadata().staticRoute
				if (staticPath === false) continue

				const segments = staticPath.split('/').filter(Boolean)
				if (segments.length === 0) continue

				const routeDirectory = path.join(outputDirectory, ...segments)
				await mkdir(routeDirectory, { recursive: true })
				await writeFile(path.join(routeDirectory, 'index.html'), indexHtml, 'utf8')
			}
		},
	}
}

async function checkFileExists(filePath: string) {
	return await access(filePath, constants.F_OK)
		.then(() => true)
		.catch(() => false)
}
