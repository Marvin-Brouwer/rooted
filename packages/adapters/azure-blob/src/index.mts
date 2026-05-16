import { staticAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

/**
 * Adapter for Azure Blob Storage static website hosting.
 *
 * Writes pre-rendered HTML files and a `404.html` SPA shell. Azure Blob static
 * websites serve from the `$web` container; the error document is configured in
 * the portal or CLI and resolves to `404.html`.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { azureBlobAdapter } from '@rooted-adapters/azure-blob'
 *
 * export default rootedManifest({
 *   plugins: [azureBlobAdapter()],
 * })
 * ```
 */
export function azureBlobAdapter(): Plugin {
	return staticAdapter({ name: 'rooted:azure-blob' })
}
