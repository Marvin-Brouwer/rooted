import { staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link codebergPagesAdapter}.
 */
export type CodebergPagesAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Adapter for Codeberg Pages.
 *
 * Writes standard static HTML files following the [git-pages.org](https://git-pages.org/)
 * format, which Codeberg Pages supports.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { codebergPagesAdapter } from '@rooted-adapters/codeberg-pages'
 *
 * export default rootedManifest({
 *   plugins: [codebergPagesAdapter()],
 * })
 * ```
 */
export function codebergPagesAdapter(options?: CodebergPagesAdapterOptions): Plugin {
	return staticAdapter({ name: 'rooted:codeberg-pages', routes: options?.routes })
}
