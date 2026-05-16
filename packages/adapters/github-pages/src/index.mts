import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

/**
 * Adapter for GitHub Pages.
 *
 * After a production build:
 * - Writes `.nojekyll` so GitHub Pages doesn't try to process the output with Jekyll.
 * - Writes `404.html` (a plain SPA shell) so GitHub Pages serves the app for any
 *   URL that doesn't match a real file.
 * - For every static route found by `generateRouteManifest`, writes a
 *   `{route}/index.html` with pre-rendered HTML.
 *
 * Set `webManifest.url` in `rootedManifest` to configure the deployment base path.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 * import { githubPagesAdapter } from '@rooted-adapters/github-pages'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     githubPagesAdapter(),
 *   ],
 *   webManifest: {
 *     id: 'my-app',
 *     url: packageJson.homepage
 *   },
 * })
 * ```
 */
export function githubPagesAdapter(): Plugin {
	return staticAdapter({
		name: 'rooted:github-pages',
		async setup({ outputDirectory }) {
			await writeFile(
				path.join(outputDirectory, '.nojekyll'),
				'disable jekyll in this github pages directory',
				'utf8',
			)
		},
	})
}
