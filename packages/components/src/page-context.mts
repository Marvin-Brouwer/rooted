const controller = new AbortController()
// eslint-disable-next-line unicorn/prefer-global-this
if (typeof window !== 'undefined') {
	window.addEventListener('pagehide', (event) => {
		if (!event.persisted) {
			controller.abort('page unloaded')
		}
	})
}

/**
 * @internal
 * Aborts when the page is permanently unloaded. Uses `pagehide` (not `unload`
 * or `beforeunload`) so it does NOT abort when the page enters the browser's
 * back-forward cache. When `event.persisted` is `true` the page is frozen
 * rather than destroyed, and component signals must remain active.
 *
 * Every component's `AbortController` chains to this signal, so unmounting and
 * page tear-down both clean up listeners with no user code.
 *
 * Consumed by `GenericComponent`. Not part of the public API.
 */
export const pageSignal: AbortSignal = controller.signal
