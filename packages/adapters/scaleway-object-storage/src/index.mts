import { staticAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

/**
 * Adapter for Scaleway Object Storage static website hosting.
 *
 * Scaleway expects the fallback file to be named `error.html` rather than `404.html`.
 * This adapter pre-configures that name automatically.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { scalewayObjectStorageAdapter } from '@rooted-adapters/scaleway-object-storage'
 *
 * export default rootedManifest({
 *   plugins: [scalewayObjectStorageAdapter()],
 * })
 * ```
 */
export function scalewayObjectStorageAdapter(): Plugin {
	return staticAdapter({
		name: 'rooted:scaleway-object-storage',
		fallbackFileName: 'error.html',
	})
}
