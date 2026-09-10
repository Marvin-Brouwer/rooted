import { isClient } from './is-client.mts'

/**
 * @internal
 * Creates a signal that aborts when the page is permanently unloaded.
 *
 * Uses `pagehide` (not `unload` or `beforeunload`) so it does NOT abort when
 * the page enters the browser's back-forward cache. When `event.persisted` is
 * `true` the page is frozen rather than destroyed, and listeners have to stay
 * active for when the user comes back.
 *
 * Every call wires up its own listener and hands back its own signal, so
 * packages don't share one and aborting one can't reach into another. Call it
 * once per package at module scope, not per component or per store.
 *
 * Outside a browser (SSR, tests under node) there's no `pagehide` to listen
 * for, so the signal simply never aborts.
 */
export function createGlobalAbortSignal(): AbortSignal {
	const controller = new AbortController()

	if (isClient()) {
		window.addEventListener('pagehide', (event) => {
			if (!event.persisted) {
				controller.abort('page unloaded')
			}
		})
	}

	return controller.signal
}
