import { staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link gitPagesAdapter}.
 */
export type GitPagesAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Base adapter for git-hosted static pages.
 *
 * Writes the standard static HTML files and a `404.html` SPA shell fallback.
 * Suitable for any git-based page host following the [git-pages.org](https://git-pages.org/) standard.
 *
 * Platform-specific adapters (GitHub Pages, GitLab Pages, Codeberg Pages) extend this adapter.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { gitPagesAdapter } from '@rooted-adapters/git-pages'
 *
 * export default rootedManifest({
 *   plugins: [gitPagesAdapter()],
 * })
 * ```
 */
export function gitPagesAdapter(options?: GitPagesAdapterOptions): Plugin {
	return staticAdapter({ name: 'rooted:git-pages', routes: options?.routes })
}
