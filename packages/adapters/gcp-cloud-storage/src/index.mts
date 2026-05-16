import { staticAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

/**
 * Adapter for Google Cloud Storage static website hosting.
 *
 * Writes pre-rendered HTML files and a `404.html` SPA shell. GCS bucket website
 * hosting uses `404.html` as the not-found page -- no extra files needed.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { gcpCloudStorageAdapter } from '@rooted-adapters/gcp-cloud-storage'
 *
 * export default rootedManifest({
 *   plugins: [gcpCloudStorageAdapter()],
 * })
 * ```
 */
export function gcpCloudStorageAdapter(): Plugin {
	return staticAdapter({ name: 'rooted:gcp-cloud-storage' })
}
