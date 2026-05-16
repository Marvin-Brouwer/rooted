import { staticAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

/**
 * Adapter for Cloudflare R2 static website hosting.
 *
 * Writes pre-rendered HTML files and a `404.html` SPA shell. R2 public buckets
 * serve static files; `404.html` acts as the fallback for unknown paths.
 *
 * For Cloudflare-hosted apps that need server-side routing, see
 * `@rooted-adapters/cloudflare-pages` (static with `_redirects`) instead.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { cloudflareR2Adapter } from '@rooted-adapters/cloudflare-r2'
 *
 * export default rootedManifest({
 *   plugins: [cloudflareR2Adapter()],
 * })
 * ```
 */
export function cloudflareR2Adapter(): Plugin {
	return staticAdapter({ name: 'rooted:cloudflare-r2' })
}
