import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { buildRedirectsFile, staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link netlifyHostingAdapter}.
 */
export type NetlifyHostingAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Adapter for Netlify static hosting.
 *
 * Writes a `_redirects` file to the output directory with one `200` rule per
 * dynamic route, so `/recipe/42/` serves the SPA shell and the browser-side
 * router renders it.
 *
 * There is no catch-all rule. Netlify serves a top-level `404.html`
 * automatically for "any failed paths that do not resolve to a static file",
 * and a `/*  /404.html  200` line would override that with a `200` on every
 * typo and every scanner probe.
 *
 * Netlify matches `:param` against a single path segment, and the rules are
 * written without a trailing slash, so both `/recipe/42` and `/recipe/42/`
 * serve the page. `vite dev` still redirects the first to the second; Netlify
 * doesn't, so dev is the stricter of the two.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { netlifyHostingAdapter } from '@rooted-adapters/netlify-hosting'
 *
 * export default rootedManifest({
 *   plugins: [netlifyHostingAdapter()],
 * })
 * ```
 */
export function netlifyHostingAdapter(options?: NetlifyHostingAdapterOptions): Plugin[] {
	return staticAdapter({
		name: 'rooted:netlify-hosting',
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
