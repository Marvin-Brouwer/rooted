import path from 'node:path'

import { toPosixPath } from '../utility/request-url.mts'

import { createMiddlewareChain } from './chain.mts'
import { loadSources } from './loader.mts'

import type { NodeMiddlewareServerOptions } from '../node-middleware.mts'
import type { ResolvedConfig, ViteDevServer } from 'vite'

/**
 * The `vite dev` half of {@link nodeMiddlewareServer}.
 *
 * Loads the middleware sources through Vite's SSR module runner, so TypeScript
 * works with no bundling step, and rebuilds the framework instance whenever a
 * file in the folder changes.
 */
export function developmentMiddleware<TApplication>(
	options: NodeMiddlewareServerOptions<TApplication>,
	config: ResolvedConfig,
) {
	return (server: ViteDevServer): void => {
		if (!options.middlewarePath) return
		const directory = path.resolve(config.root, options.middlewarePath)
		const chain = createMiddlewareChain(options, config, reload =>
			loadSources<TApplication>(server, directory, options.name, config, reload))

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
	}
}
