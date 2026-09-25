import { Window } from 'happy-dom'

import { installDomGlobals } from './install.mts'

// Only one DOM may be installed at a time. Overlapping calls would capture the
// already-installed fake globals as the "previous" ones and restore those,
// leaving a fake DOM behind for the rest of the process.
let queue: Promise<unknown> = Promise.resolve()

/** Options for {@link withDomGlobals}. */
export type WithDomGlobalsOptions = {
	/**
	 * The window to install. Leave it out to get a fresh happy-dom `Window` on `http://localhost/`, closed afterwards.
	 * A window you pass in is yours: it isn't closed, so tear it down inside `evaluate`.
	 */
	window?: object
	/**
	 * Also install `fetch`, `Request`, `Response`, `Headers`, `FormData`, `Blob` and `File` from the window.
	 * Off by default, because Node has its own and most build code expects those.
	 */
	fetch?: boolean
}

/**
 * Runs `evaluate` with a DOM installed on `globalThis`, then restores the environment exactly as it was.
 *
 * Plain Node has no DOM, and framework code touches it at module scope (custom element registration,
 * adopted stylesheets, classes extending `HTMLElement` or `ErrorEvent`).
 * The route manifest plugin needs one to evaluate route files, the pre-renderer needs one to boot the built app.
 * This hands Node a DOM for exactly as long as that takes.
 *
 * Globals are captured and restored as property descriptors, not values, so anything that existed before keeps its original shape.
 * Calls are serialized, and the previous environment is restored even when `evaluate` throws.
 * So don't call `withDomGlobals` from inside `evaluate`: the inner call waits for the outer one, which waits for it.
 *
 * Don't install a DOM for the whole build instead. Libraries decide whether they're in Node by checking for `document`,
 * and the `import.meta.url` shim Rollup emits into CommonJS output is one of them:
 * it resolves to `http://localhost/` instead of a file URL, which breaks vite-plugin-pwa's service worker write.
 *
 * Note: Rollup runs `buildStart` as a parallel hook,
 * so another plugin's async `buildStart` can interleave with the window where these globals exist.
 *
 * @example
 * ```ts
 * const routeModule = await withDomGlobals(() => jiti.import(routeFile))
 * ```
 */
export async function withDomGlobals<T>(evaluate: () => Promise<T>, options: WithDomGlobalsOptions = {}): Promise<T> {
	const run = queue.then(async () => {
		const window = options.window ?? new Window({ url: 'http://localhost/' })
		const restore = installDomGlobals(window, options.fetch)

		try {
			return await evaluate()
		}
		finally {
			restore()
			// Release happy-dom's timers and observers so the build can exit
			if (!options.window) await (window as Window).happyDOM?.close?.()
		}
	})

	queue = run.catch(() => void 0)
	return run
}
