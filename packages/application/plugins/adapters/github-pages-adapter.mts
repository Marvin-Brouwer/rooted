import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from './adapter.mts'

import type { Plugin } from 'vite'

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
 * communication (`plugin.api`) -- no manual wiring needed. If the manifest
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
