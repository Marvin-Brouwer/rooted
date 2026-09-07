import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { toPosixPath } from '../utility/request-url.mts'

import type { ResolvedConfig, ViteDevServer } from 'vite'

/** The extensions the build hook hands to rolldown. Dev reads the same set. */
const SOURCE_EXTENSIONS = /\.(mts|ts|mjs|js)$/
/** What the build hook writes into `dist/middleware`, and all preview can run. */
const BUILT_EXTENSIONS = /\.mjs$/

/**
 * Loads the middleware sources through Vite, so TypeScript works with no
 * bundling step.
 *
 * `reload` clears the runner's cache first. Without it the runner hands back the
 * module it already has and a rebuild after an edit does nothing.
 */
export async function loadSources<TApplication>(
	server: ViteDevServer,
	directory: string,
	name: string,
	config: ResolvedConfig,
	reload: boolean,
): Promise<Array<(application: TApplication) => Promise<void>>> {
	// Imported here rather than at the top of the module: @rooted/adapter is
	// loaded by runtime consumers of the adapter packages, and they shouldn't
	// pay for vite. This only ever runs inside a dev server, where it's loaded.
	const { isRunnableDevEnvironment } = await import('vite')
	const environment = server.environments.ssr
	const runnable = isRunnableDevEnvironment(environment)
	if (reload && runnable) environment.runner.clearCache()

	const modules: Array<(application: TApplication) => Promise<void>> = []
	for (const file of await listMiddlewareFiles(directory, SOURCE_EXTENSIONS, name, config)) {
		// ssrLoadModule is the older spelling of the same thing; it's the
		// fallback for anyone who swapped in a non-runnable ssr environment.
		const loaded = runnable
			? await environment.runner.import<Record<string, unknown>>(toPosixPath(file))
			: await server.ssrLoadModule(toPosixPath(file))
		const register = toRegisterFunction<TApplication>(loaded, file, name, config)
		if (register) modules.push(register)
	}
	return modules
}

/**
 * Loads the built `dist/middleware/*.mjs` files, which is all preview can do:
 * there is no module runner there. It shows you the last build, not your
 * working tree.
 */
export async function loadBuilt<TApplication>(
	directory: string,
	name: string,
	config: ResolvedConfig,
): Promise<Array<(application: TApplication) => Promise<void>>> {
	const modules: Array<(application: TApplication) => Promise<void>> = []
	for (const file of await listMiddlewareFiles(directory, BUILT_EXTENSIONS, name, config)) {
		const loaded = await import(pathToFileURL(file).href) as Record<string, unknown>
		const register = toRegisterFunction<TApplication>(loaded, file, name, config)
		if (register) modules.push(register)
	}
	return modules
}

/** Flat listing, lexicographic, matching the order the generated server uses. */
async function listMiddlewareFiles(
	directory: string,
	extensions: RegExp,
	name: string,
	config: ResolvedConfig,
): Promise<string[]> {
	const entries = await readdir(directory).catch(() => undefined)
	if (!entries) {
		config.logger.warn(`[${name}] No middleware folder at "${directory}", skipping it.`)
		return []
	}
	return entries
		.filter(entry => extensions.test(entry))
		.sort()
		.map(entry => path.join(directory, entry))
}

/**
 * Wraps a loaded file's default export so a throw is logged rather than taking
 * the server with it. Returns undefined for a file that exports nothing usable.
 */
function toRegisterFunction<TApplication>(
	loaded: Record<string, unknown>,
	file: string,
	name: string,
	config: ResolvedConfig,
): ((application: TApplication) => Promise<void>) | undefined {
	const register = loaded.default
	if (typeof register !== 'function') {
		config.logger.warn(`[${name}] "${path.basename(file)}" has no default export, skipping it.`)
		return undefined
	}

	return async (application) => {
		try {
			await (register as (application: TApplication) => Promise<void> | void)(application)
		}
		catch (error) {
			config.logger.error(`[${name}] "${path.basename(file)}" failed to register: ${String(error)}`)
		}
	}
}
