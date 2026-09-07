import path from 'node:path'

import { createMiddlewareChain } from './node-middleware.chain.mts'
import { loadBuilt, loadSources } from './node-middleware.loader.mts'
import { toPosixPath } from './utility/request-url.mts'

import type { NodeMiddlewareServerOptions } from './node-middleware.types.mts'
import type { Plugin, ResolvedConfig } from 'vite'

export type * from './node-middleware.types.mts'

/**
 * Runs a routed adapter's `middlewarePath` files during `vite dev` and
 * `vite preview`, in Vite's own process and on Vite's own port. No second
 * entry point, no `concurrently`, no `server.proxy` entry.
 *
 * In dev the sources are loaded through Vite's SSR module runner, so TypeScript
 * middleware works with no bundling step. Preview has no module runner, so it
 * imports the built `dist/middleware/*.mjs` files instead -- the same files, in
 * the same order, as the generated `server.mjs`. That means preview shows you
 * the last build, not your working tree.
 *
 * Editing a middleware file rebuilds the whole framework instance on the next
 * request. It doesn't patch individual routes, because most frameworks won't
 * let you add routes after boot, but it does avoid restarting the process.
 *
 * @example
 * ```ts
 * nodeMiddlewareServer<Express>({
 *   name: 'rooted:express-dev',
 *   middlewarePath: options?.middlewarePath,
 *   async createServer(middleware) {
 *     const { default: express } = await import('express')
 *     const app = express()
 *     for (const { register } of middleware) await register(app)
 *     return { handle: app as unknown as Connect.NextHandleFunction }
 *   },
 * })
 * ```
 */
export function nodeMiddlewareServer<TApplication>(
	options: NodeMiddlewareServerOptions<TApplication>,
): Plugin {
	let config: ResolvedConfig

	return {
		name: options.name,
		apply: 'serve',

		configResolved(resolved) {
			config = resolved
		},

		configureServer(server) {
			if (!options.middlewarePath) return
			const directory = path.resolve(config.root, options.middlewarePath)
			const chain = createMiddlewareChain(options, config, 'dev', reload =>
				loadSources(server, directory, options, config, reload))

			server.watcher.add(directory)
			server.watcher.on('all', (_event, changed) => {
				if (toPosixPath(path.dirname(changed)) !== toPosixPath(directory)) return
				config.logger.info(`[${options.name}] middleware changed, rebuilding`)
				void chain.reset()
			})
			server.httpServer?.once('close', () => void chain.reset())

			// Registered directly rather than from the returned post hook, so it
			// lands ahead of Vite's transform and static middlewares. /api has to
			// win over the SPA fallback, the same way it does in the built server.
			server.middlewares.use(chain.handle)
		},

		configurePreviewServer(server) {
			if (!options.middlewarePath) return
			const outputDirectory = path.resolve(config.root, config.environments.client.build.outDir)
			const chain = createMiddlewareChain(options, config, 'preview', () =>
				loadBuilt(path.join(outputDirectory, 'middleware'), options, config))

			server.middlewares.use(chain.handle)
		},
	}
}
