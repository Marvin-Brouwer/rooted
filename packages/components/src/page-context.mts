const controller = new AbortController()
window.addEventListener('pagehide', (event) => {
	if (!event.persisted) {
		controller.abort('page unloaded')
	}
})

/**
 * Page-level `AbortSignal` that fires when the page is permanently unloaded.
 *
 * Uses the `pagehide` event rather than `unload` or `beforeunload` so that
 * the signal does **not** abort when the page enters the browser's
 * back-forward cache (bfcache). When `event.persisted` is `true` the page
 * is frozen rather than destroyed, and it may be restored later — in that
 * case component signals must remain active.
 *
 * Every component's `AbortController` is chained to this signal: components
 * are cleaned up both when individually unmounted and when the page itself
 * is torn down, with no extra user code required.
 *
 * @internal Not part of the public API; consumed by `GenericComponent`.
 */
export const pageSignal = controller.signal