import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { routedAdapter } from '@rooted/adapter'

import { createExpressServer } from './development-server.mts'
import { buildExpressTemplate } from './server-template.mts'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Express } from 'express'
import type { Plugin } from 'vite'

/**
 * Options for {@link expressAdapter}.
 */
export type ExpressAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
	/**
	 * Path to a folder of middleware files, relative to the Vite project root.
	 * Files can be `.mts`, `.ts`, `.mjs`, or `.js` -- TypeScript is transpiled with
	 * rolldown at build time. Each file must export a default `function(app)` that
	 * registers middleware on the Express instance. Files are loaded in lexicographic
	 * order, so numeric prefixes (`01-auth.mts`, `02-proxy.mts`) control load order.
	 * Middleware runs before the rooted static-file and route handlers.
	 *
	 * The same files also run during `vite dev` and `vite preview`, on Vite's own
	 * port, so you don't need a second process to reach them. Dev loads the
	 * sources through Vite, preview runs the built `dist/middleware/*.mjs`.
	 * See the [server middleware guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/server-middleware.md).
	 *
	 * @example
	 * ```ts
	 * expressAdapter({ middlewarePath: './src/server-middleware' })
	 * ```
	 *
	 * ```ts
	 * // src/server-middleware/01-api-proxy.mts
	 * import { createMiddleware } from '@rooted-adapters/express/middleware'
	 * import { createProxyMiddleware } from 'http-proxy-middleware'
	 *
	 * export default createMiddleware((app) => {
	 *   app.use('/api', createProxyMiddleware({ target: process.env.API_URL }))
	 * })
	 * ```
	 */
	middlewarePath?: string
}

/**
 * Adapter for server-side hosting with Express.
 *
 * Writes `routes.json` and a ready-to-run `server.mjs` to the output directory.
 * The server uses `express.static` to serve pre-rendered HTML files and registers
 * explicit handlers for parameterized routes (which serve the `404.html` SPA shell
 * so the browser-side router renders the correct content). Express uses the same
 * `:param` syntax as the rooted router, so patterns map directly.
 *
 * Users start the server with `node dist/server.mjs`. The `PORT` environment variable
 * controls the port (default: 3000).
 *
 * Returns several plugins: the build-time adapter, the not-found handler that
 * gives `vite dev` and `vite preview` the same 404s and redirects as the
 * generated server, and one that runs `middlewarePath` on Vite's own port. Vite
 * flattens nested plugin arrays, so it still goes straight into `plugins` as
 * one entry.
 *
 * Requires `express >= 5.0.0` in the project.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 * import { expressAdapter } from '@rooted-adapters/express/middleware'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     expressAdapter(),
 *   ],
 * })
 * ```
 */
export function expressAdapter(options?: ExpressAdapterOptions): Plugin[] {
	return routedAdapter<Express>({
		name: 'rooted:express',
		routes: options?.routes,
		middlewarePath: options?.middlewarePath,
		createServer: createExpressServer,
		async setup({ outputDirectory }) {
			await writeFile(
				path.join(outputDirectory, 'server.mjs'),
				buildExpressTemplate(!!options?.middlewarePath),
				'utf8',
			)
		},
	})
}
