import { developmentMiddleware } from './node-middleware/development.mts'
import { previewMiddleware } from './node-middleware/preview.mts'

import type { Connect, Plugin, ResolvedConfig } from 'vite'

/**
 * What {@link NodeMiddlewareServerOptions.createServer} hands back.
 */
export type NodeMiddlewareHandler = {
	/**
	 * The connect handler that gets plugged into Vite's chain. It has to call
	 * `next()` for anything the framework has no route for, or nothing else on
	 * the page gets served.
	 */
	handle: Connect.NextHandleFunction
	/** Called when a middleware file changes, or when the server shuts down. */
	close?(): Promise<void> | void
}

/**
 * Passed to {@link NodeMiddlewareServerOptions.createServer}.
 */
export type NodeMiddlewareContext = {
	/** The Vite resolved config. Use `config.logger` rather than `console`. */
	config: ResolvedConfig
}

/**
 * Options for {@link nodeMiddlewareServer}.
 *
 * Nothing here knows about a specific framework. The adapter package supplies
 * that in `createServer`, which is why this lives in `@rooted/adapter` without
 * dragging Fastify or Express in with it.
 */
export type NodeMiddlewareServerOptions<TApplication> = {
	/** Vite plugin name, e.g. `'rooted:fastify-dev'`. */
	name: string
	/**
	 * The adapter's `middlewarePath` option, resolved against the Vite project
	 * root. The plugin does nothing when it's undefined.
	 */
	middlewarePath: string | undefined
	/**
	 * Create the framework instance, register `middleware` in the order given,
	 * and return a connect handler for it.
	 *
	 * Each entry is one middleware file's default export, already wrapped so a
	 * throw is logged rather than taking the server down.
	 *
	 * Register your fall-through before looping over `middleware`, so it wins
	 * over any hook the user's own middleware adds.
	 */
	createServer(
		middleware: ReadonlyArray<(application: TApplication) => Promise<void>>,
		context: NodeMiddlewareContext,
	): Promise<NodeMiddlewareHandler> | NodeMiddlewareHandler
}

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
 * `routedAdapter` composes this for you when you give it `createServer`. Reach
 * for it directly only when you're building an adapter by hand.
 *
 * @example
 * ```ts
 * nodeMiddlewareServer<Express>({
 *   name: 'rooted:express-dev',
 *   middlewarePath: options?.middlewarePath,
 *   async createServer(middleware) {
 *     const { default: express } = await import('express')
 *     const app = express()
 *     for (const register of middleware) await register(app)
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
			developmentMiddleware(options, config)(server)
		},

		configurePreviewServer(server) {
			previewMiddleware(options, config)(server)
		},
	}
}
