import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { Connect, Plugin, ResolvedConfig, ViteDevServer } from 'vite'

/** Vite ids are posix, and so are the paths chokidar reports back. */
function toPosixPath(value: string): string {
	return value.split('\\').join('/')
}

/** The extensions the build hook hands to rolldown. Dev reads the same set. */
const SOURCE_EXTENSIONS = /\.(mts|ts|mjs|js)$/
/** What the build hook writes into `dist/middleware`, and all preview can run. */
const BUILT_EXTENSIONS = /\.mjs$/

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

/**
 * Passed to {@link NodeMiddlewareServerOptions.createServer}.
 */
export type NodeMiddlewareContext = {
	/** The Vite resolved config. Use `config.logger` rather than `console`. */
	config: ResolvedConfig
	/** `'dev'` runs the middleware sources, `'preview'` runs the built files. */
	mode: 'dev' | 'preview'
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
	 * Register your fall-through before looping over `middleware`, so it wins
	 * over any hook the user's own middleware adds.
	 */
	createServer(
		middleware: ReadonlyArray<MiddlewareModule<TApplication>>,
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

// ---------------------------------------------------------------------------

type MiddlewareChain = {
	/** The connect handler to register on the server. */
	handle: Connect.NextHandleFunction
	/** Drops the current instance so the next request builds a fresh one. */
	reset(): Promise<void>
}

function createMiddlewareChain<TApplication>(
	options: NodeMiddlewareServerOptions<TApplication>,
	config: ResolvedConfig,
	mode: 'dev' | 'preview',
	load: (reload: boolean) => Promise<Array<MiddlewareModule<TApplication>>>,
): MiddlewareChain {
	let pending: Promise<NodeMiddlewareHandler | undefined> | undefined
	let built = false

	// Built on the first request, not while configuring: at hook time there is
	// nothing to serve yet, and a throw there takes the whole server down.
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

async function loadSources<TApplication>(
	server: ViteDevServer,
	directory: string,
	options: NodeMiddlewareServerOptions<TApplication>,
	config: ResolvedConfig,
	reload: boolean,
): Promise<Array<MiddlewareModule<TApplication>>> {
	// Imported here rather than at the top of the module: @rooted/adapter is
	// loaded by runtime consumers of the adapter packages, and they shouldn't
	// pay for vite. This only ever runs inside a dev server, where it's loaded.
	const { isRunnableDevEnvironment } = await import('vite')
	const environment = server.environments.ssr
	const runnable = isRunnableDevEnvironment(environment)
	// Without this the runner hands back the module it already has and a
	// rebuild after an edit is a no-op.
	if (reload && runnable) environment.runner.clearCache()

	const modules: Array<MiddlewareModule<TApplication>> = []
	for (const file of await listMiddlewareFiles(directory, SOURCE_EXTENSIONS, options, config)) {
		// ssrLoadModule is the older spelling of the same thing; it's the
		// fallback for anyone who swapped in a non-runnable ssr environment.
		const loaded = runnable
			? await environment.runner.import<Record<string, unknown>>(toPosixPath(file))
			: await server.ssrLoadModule(toPosixPath(file))
		const module = toMiddlewareModule<TApplication>(loaded, file, options, config)
		if (module) modules.push(module)
	}
	return modules
}

async function loadBuilt<TApplication>(
	directory: string,
	options: NodeMiddlewareServerOptions<TApplication>,
	config: ResolvedConfig,
): Promise<Array<MiddlewareModule<TApplication>>> {
	const modules: Array<MiddlewareModule<TApplication>> = []
	for (const file of await listMiddlewareFiles(directory, BUILT_EXTENSIONS, options, config)) {
		const loaded = await import(pathToFileURL(file).href) as Record<string, unknown>
		const module = toMiddlewareModule<TApplication>(loaded, file, options, config)
		if (module) modules.push(module)
	}
	return modules
}

/** Flat listing, lexicographic, matching the order the generated server uses. */
async function listMiddlewareFiles<TApplication>(
	directory: string,
	extensions: RegExp,
	options: NodeMiddlewareServerOptions<TApplication>,
	config: ResolvedConfig,
): Promise<string[]> {
	const entries = await readdir(directory).catch(() => undefined)
	if (!entries) {
		config.logger.warn(`[${options.name}] No middleware folder at "${directory}", skipping it.`)
		return []
	}
	return entries
		.filter(entry => extensions.test(entry))
		.sort()
		.map(entry => path.join(directory, entry))
}

function toMiddlewareModule<TApplication>(
	loaded: Record<string, unknown>,
	file: string,
	options: NodeMiddlewareServerOptions<TApplication>,
	config: ResolvedConfig,
): MiddlewareModule<TApplication> | undefined {
	const register = loaded.default
	if (typeof register !== 'function') {
		config.logger.warn(`[${options.name}] "${path.basename(file)}" has no default export, skipping it.`)
		return undefined
	}

	return {
		file,
		async register(application) {
			try {
				await (register as (application: TApplication) => Promise<void> | void)(application)
			}
			catch (error) {
				config.logger.error(`[${options.name}] "${path.basename(file)}" failed to register: ${String(error)}`)
			}
		},
	}
}
