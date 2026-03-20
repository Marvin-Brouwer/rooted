import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin, ResolvedConfig } from 'vite'

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'

/**
 * GitHub Pages adapter plugin.
 *
 * After a production build:
 * - Writes `404.html` (copy of `index.html`) so GitHub Pages serves the SPA
 *   for any URL that doesn't match a real file.
 * - For every static route discovered by {@link generateRouteManifest}, writes
 *   a `{route}/index.html` so direct URL loads land on the correct page.
 *
 * Automatically connects to `generateRouteManifest` via Vite's inter-plugin
 * communication (`plugin.api`) — no manual wiring needed. If the manifest
 * plugin is absent, only `404.html` is written.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest, githubPages } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 *
 * export default rootedManifest({
 *   plugins: [generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' })],
 *   adapter: githubPages(),
 *   webManifest: { id: 'my-app' },
 * })
 * ```
 */
export function githubPages(): Plugin {
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
			const outDir = config.build.outDir
			const indexHtml = await readFile(join(outDir, 'index.html'), 'utf-8')

			await writeFile(join(outDir, '.nojekyll'), 'disable jekyll in this github pages directory', 'utf-8')
			await writeFile(join(outDir, '404.html'), indexHtml, 'utf-8')

			for (const route of manifestApi?.routes ?? []) {
				if (!Object.hasOwn(route, 'getMetadata')) continue

				const staticPath = route.getMetadata().staticRoute
				if (staticPath === false) continue

				const segments = staticPath.split('/').filter(Boolean)
				if (segments.length === 0) continue

				const routeDir = join(outDir, ...segments)
				await mkdir(routeDir, { recursive: true })
				await writeFile(join(routeDir, 'index.html'), indexHtml, 'utf-8')
			}
		},
	}
}
