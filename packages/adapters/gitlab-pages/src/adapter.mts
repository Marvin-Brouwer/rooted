import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

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
 * Writes a `_redirects` file (Netlify-compatible syntax) so GitLab Pages routes
 * any unknown path to `404.html` -- the plain SPA shell that lets the browser-side
 * router handle the URL.
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
export function gitlabPagesAdapter(options?: GitLabPagesAdapterOptions): Plugin {
	return staticAdapter({
		name: 'rooted:gitlab-pages',
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
