import { staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link staticSiteAdapter}.
 */
export type StaticSiteAdapterOptions = {
	/**
	 * Name of the catch-all fallback HTML file.
	 * Defaults to `'404.html'`.
	 */
	fallbackFileName?: string
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Base adapter for S3-compatible and object-storage static hosts.
 *
 * Writes pre-rendered HTML files and a fallback SPA shell for any path not
 * matching a real file. Works for AWS S3, GCP Cloud Storage, Azure Blob,
 * Cloudflare R2, DigitalOcean Spaces, STACKIT, OVH, and any other S3-compatible host.
 *
 * Platform-specific adapters (like `@rooted-adapters/scaleway-object-storage`) extend
 * this with pre-configured options.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { staticSiteAdapter } from '@rooted-adapters/static-site'
 *
 * export default rootedManifest({
 *   plugins: [staticSiteAdapter()],
 * })
 * ```
 */
export function staticSiteAdapter(options?: StaticSiteAdapterOptions): Plugin {
	return staticAdapter({
		name: 'rooted:static-site',
		fallbackFileName: options?.fallbackFileName,
		routes: options?.routes,
	})
}
