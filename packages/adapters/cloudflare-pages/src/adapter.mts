import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { buildRedirectsFile, staticAdapter } from '@rooted/adapter'

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
 * Writes a `_redirects` file to the output directory with one `200` rule per
 * dynamic route, so `/recipe/42/` serves the SPA shell and the browser-side
 * router renders it.
 *
 * There is no catch-all rule. Cloudflare serves the nearest `404.html` with a
 * real `404` for a request that matches no file, and it doesn't support `404`
 * as a `_redirects` status, so a `/*  /404.html  200` line is the only way to
 * answer an unknown path and it answers it wrong. Note that Pages only does
 * this when a top-level `404.html` exists, which the adapter always writes;
 * without one it assumes you're deploying a single-page application.
 *
 * The rules are written without a trailing slash, so both `/recipe/42` and
 * `/recipe/42/` serve the page. `vite dev` still redirects the first to the
 * second; Cloudflare doesn't.
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
export function cloudflarePagesAdapter(options?: CloudflarePagesAdapterOptions): Plugin[] {
	return staticAdapter({
		name: 'rooted:cloudflare-pages',
		routes: options?.routes,
		// The rules below are what the host matches :param routes with.
		dynamicRoutes: 'routed',
		async setup({ outputDirectory, resolvedRoutes }) {
			await writeFile(
				path.join(outputDirectory, '_redirects'),
				buildRedirectsFile(resolvedRoutes.dynamicPatterns, '404.html'),
				'utf8',
			)
		},
	})
}
