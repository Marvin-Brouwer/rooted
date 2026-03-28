import { isClient } from '@rooted/util'

const SCROLL_KEY = '@rooted/scrollY'

/**
 * Saves the current vertical scroll position into `history.state` so it can
 * be restored when the user navigates back/forward.
 *
 * Uses `history.replaceState` which does **not** dispatch a `popstate` event,
 * so this is safe to call freely without interfering with other listeners.
 */
export function saveScrollPosition(): void {
	if (!isClient()) return
	history.replaceState({ ...(history.state ?? {}), [SCROLL_KEY]: window.scrollY }, '')
}

/**
 * Reads the saved scroll position from a `history.state` object.
 *
 * Returns `undefined` if the state is not an object or does not contain a
 * saved scroll position (e.g. on the initial page load or after a push
 * navigation where no scroll position was stored).
 */
export function getSavedScrollPosition(state: unknown): number | undefined {
	if (state === null || typeof state !== 'object') return undefined
	const v = (state as Record<string, unknown>)[SCROLL_KEY]
	return typeof v === 'number' ? v : undefined
}
