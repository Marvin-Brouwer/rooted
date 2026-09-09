import path from 'node:path'

import { createMiddlewareChain } from './chain.mts'
import { loadBuilt } from './loader.mts'

import type { NodeMiddlewareServerOptions } from '../node-middleware.mts'
import type { PreviewServer, ResolvedConfig } from 'vite'

/**
 * The `vite preview` half of {@link nodeMiddlewareServer}.
 *
 * There is no module runner here, so it imports the built
 * `dist/middleware/*.mjs` files instead: the same files, in the same order, as
 * the generated `server.mjs`. That means preview shows you the last build, not
 * your working tree.
 */
export function previewMiddleware<TApplication>(
	options: NodeMiddlewareServerOptions<TApplication>,
	config: ResolvedConfig,
) {
	return (server: PreviewServer): void => {
		if (!options.middlewarePath) return
		const outputDirectory = path.resolve(config.root, config.environments.client.build.outDir)
		const chain = createMiddlewareChain(options, config, () =>
			loadBuilt<TApplication>(path.join(outputDirectory, 'middleware'), options.name, config))

		server.middlewares.use(chain.handle)
	}
}
