import { isClient } from '@rooted/util'

/**
 * Runs `render` inside a view transition, or plainly when the browser doesn't
 * support one.
 *
 * Overlapping navigations are normal in a router: routes load through dynamic
 * imports, so a back/forward press while a chunk is still fetching starts a
 * second transition before the first has finished. The browser then skips the
 * first one and rejects its `ready` promise with an `AbortError`. That's the
 * documented outcome of a skip, not a failure, so it gets caught here instead
 * of surfacing as an uncaught rejection in the console.
 *
 * `finished` and `updateCallbackDone` are deliberately left alone. Those carry
 * real render errors, and a skip doesn't reject them.
 */
export function renderWithViewTransition(render: () => void): void {
	if (!isClient() || !('startViewTransition' in document)) {
		render()
		return
	}

	document.startViewTransition(render).ready.catch(() => {
		// Skipped by a newer transition. Nothing to do.
	})
}
