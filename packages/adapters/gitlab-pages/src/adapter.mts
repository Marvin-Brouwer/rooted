import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { buildRedirectsFile, staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link gitlabPagesAdapter}.
 */
export type GitLabPagesAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Adapter for GitLab Pages (static mode).
 *
 * Writes a `_redirects` file (Netlify-compatible syntax) with one `200` rule
 * per dynamic route, so `/recipe/42/` serves the SPA shell and the
 * browser-side router renders it. GitLab matches `:param` against a single
 * path segment and doesn't match empty strings, the same as the router.
 *
 * There is no catch-all rule. GitLab serves `/404.html` for a path that
 * resolves to nothing, and it supports no rewrite status other than `200`, so
 * a `/*  /404.html  200` line would turn every unknown path into a soft 404.
 *
 * Two things to know. The rules are written without a trailing slash, so both
 * `/recipe/42` and `/recipe/42/` serve the page; `vite dev` redirects the
 * first to the second and GitLab doesn't. And on a `*.gitlab.io` namespace
 * domain GitLab's own 404 page can win over yours
 * ([gitlab-pages#183](https://gitlab.com/gitlab-org/gitlab-pages/-/issues/183)).
 *
 * For a GitLab deployment running a full Node.js server (dynamic mode), use
 * `@rooted-adapters/fastify` or `@rooted-adapters/express` instead.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { gitlabPagesAdapter } from '@rooted-adapters/gitlab-pages'
 *
 * export default rootedManifest({
 *   plugins: [gitlabPagesAdapter()],
 * })
 * ```
 */
export function gitlabPagesAdapter(options?: GitLabPagesAdapterOptions): Plugin[] {
	return staticAdapter({
		name: 'rooted:gitlab-pages',
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
