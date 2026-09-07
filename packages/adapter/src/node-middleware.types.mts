import type { Connect, ResolvedConfig } from 'vite'

/**
 * One middleware file, loaded and ready to be handed a framework instance.
 */
export type MiddlewareModule<TApplication> = {
	/** Absolute path of the file it came from. Handy in error messages. */
	file: string
	/**
	 * The file's default export. Already wrapped: if it throws, the failure is
	 * logged and swallowed, so one broken file doesn't take the server with it.
	 */
	register(application: TApplication): Promise<void>
}

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

/** Where the middleware came from, and so what it can assume. */
export type NodeMiddlewareMode = 'dev' | 'preview'

/**
 * Passed to {@link NodeMiddlewareServerOptions.createServer}.
 */
export type NodeMiddlewareContext = {
	/** The Vite resolved config. Use `config.logger` rather than `console`. */
	config: ResolvedConfig
	/** `'dev'` runs the middleware sources, `'preview'` runs the built files. */
	mode: NodeMiddlewareMode
}

/**
 * Options for `nodeMiddlewareServer`.
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
	 * Register your fall-through before looping over `middleware`, so it wins
	 * over any hook the user's own middleware adds.
	 */
	createServer(
		middleware: ReadonlyArray<MiddlewareModule<TApplication>>,
		context: NodeMiddlewareContext,
	): Promise<NodeMiddlewareHandler> | NodeMiddlewareHandler
}
