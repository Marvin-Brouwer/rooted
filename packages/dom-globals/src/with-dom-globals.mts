import { Window } from 'happy-dom'

import { installDomGlobals } from './install.mts'

// Only one DOM may be installed at a time. Overlapping calls would capture the
// already-installed fake globals as the "previous" ones and restore those,
// leaving a fake DOM behind for the rest of the process.
let queue: Promise<unknown> = Promise.resolve()

/**
 * Runs `evaluate` with a fresh happy-dom installed on `globalThis`, then restores the environment exactly as it was.
 *
 * Route files are ordinary application modules: importing one can pull in components,
 * and the framework evaluates DOM at module scope (custom element registration, adopted stylesheets,
 * classes extending `HTMLElement` or `ErrorEvent`). Plain Node has none of that,
 * so evaluating a route file there throws before any route metadata can be read.
 * This hands Node a DOM for exactly as long as that evaluation takes.
 *
 * Calls are serialized, and the previous environment is restored even when `evaluate` throws.
 * Node's own `fetch` stays in place, see {@link installDomGlobals}.
 *
 * Note: Rollup runs `buildStart` as a parallel hook,
 * so another plugin's async `buildStart` can interleave with the short window where these globals exist.
 * Isolating this in a worker is not an option, because the evaluated routes carry live `resolve`,
 * `match` and `seo` functions that later plugins call.
 *
 * @example
 * ```ts
 * const routeModule = await withDomGlobals(() => jiti.import(routeFile))
 * ```
 */
export async function withDomGlobals<T>(evaluate: () => Promise<T>): Promise<T> {
	const run = queue.then(async () => {
		const window = new Window({ url: 'http://localhost/' })
		const restore = installDomGlobals(window)

		try {
			return await evaluate()
		}
		finally {
			restore()
			// Release happy-dom's timers and observers so the build can exit
			await window.happyDOM?.close?.()
		}
	})

	queue = run.catch(() => void 0)
	return run
}
