import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link cloudflarePagesAdapter}.
 */
export type CloudflarePagesAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Adapter for Cloudflare Pages static hosting.
 *
 * Writes a single `_redirects` file to the output directory. Cloudflare Pages reads
 * this file and routes unknown paths to `404.html` -- the plain SPA shell.
 *
 * This adapter is for **static hosting only**. For server-side logic with
 * Cloudflare Workers or Functions, that requires a separate adapter not covered here.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { cloudflarePagesAdapter } from '@rooted-adapters/cloudflare-pages'
 *
 * export default rootedManifest({
 *   plugins: [cloudflarePagesAdapter()],
 * })
 * ```
 */
export function cloudflarePagesAdapter(options?: CloudflarePagesAdapterOptions): Plugin {
	return staticAdapter({
		name: 'rooted:cloudflare-pages',
		routes: options?.routes,
		async setup({ outputDirectory }) {
			await writeFile(
				path.join(outputDirectory, '_redirects'),
				'/*  /404.html  200\n',
				'utf8',
			)
		},
	})
}
