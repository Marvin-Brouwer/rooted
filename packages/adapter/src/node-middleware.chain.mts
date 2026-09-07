import type {
	MiddlewareModule,
	NodeMiddlewareHandler,
	NodeMiddlewareMode,
	NodeMiddlewareServerOptions,
} from './node-middleware.types.mts'
import type { Connect, ResolvedConfig } from 'vite'

/** A framework instance behind a connect handler, rebuildable on demand. */
export type MiddlewareChain = {
	/** The connect handler to register on the server. */
	handle: Connect.NextHandleFunction
	/** Drops the current instance so the next request builds a fresh one. */
	reset(): Promise<void>
}

/**
 * Holds the framework instance for a server, building it on the first request
 * rather than while configuring: at hook time there is nothing to serve yet, and
 * a throw there takes the whole server down.
 */
export function createMiddlewareChain<TApplication>(
	options: NodeMiddlewareServerOptions<TApplication>,
	config: ResolvedConfig,
	mode: NodeMiddlewareMode,
	load: (reload: boolean) => Promise<Array<MiddlewareModule<TApplication>>>,
): MiddlewareChain {
	let pending: Promise<NodeMiddlewareHandler | undefined> | undefined
	let built = false

	async function build(): Promise<NodeMiddlewareHandler | undefined> {
		const reload = built
		built = true
		try {
			const middleware = await load(reload)
			if (middleware.length === 0) return undefined
			return await options.createServer(middleware, { config, mode })
		}
		catch (error) {
			config.logger.error(`[${options.name}] Could not start the middleware server: ${String(error)}`)
			return undefined
		}
	}

	return {
		handle(request, response, next) {
			pending ??= build()
			void pending.then(
				handler => handler ? handler.handle(request, response, next) : next(),
				(error: unknown) => { next(error) },
			)
		},
		async reset() {
			const previous = pending
			pending = undefined
			await previous
				?.then(handler => handler?.close?.())
				.catch(() => undefined)
		},
	}
}
