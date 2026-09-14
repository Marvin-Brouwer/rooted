import { isClient } from '@rooted/util'

const SCROLL_KEY = '@rooted/scrollY'

/**
 * The scroll container of the mounted router, and whether it wants scroll
 * positions saved at all.
 *
 * `navigate` is a free function, so this is the only way it can see options
 * that belong to the router component. Set through {@link enableScrollSaving}.
 */
let scrollSaving: { target?: Element } | undefined

/**
 * Turns scroll saving on for the router that's mounting, and remembers which
 * element scrolls. Returns the function that turns it back off again; the
 * router hangs that off its lifetime signal.
 *
 * @param target - A custom scroll container. Omit for `window`.
 */
export function enableScrollSaving(target?: Element): () => void {
	scrollSaving = { target }

	return () => {
		scrollSaving = undefined
	}
}

/**
 * Saves the current vertical scroll position into `history.state` so it can
 * be restored when the user navigates back/forward.
 *
 * Does nothing until a router has called {@link enableScrollSaving}, which is
 * how `scrollBehavior.saveScrollBeforeNavigate: false` switches this off.
 *
 * Uses `history.replaceState` which does **not** dispatch a `popstate` event,
 * so this is safe to call freely without interfering with other listeners.
 */
export function saveScrollPosition(): void {
	if (!isClient() || scrollSaving === undefined) return

	history.replaceState(
		{ ...history.state, [SCROLL_KEY]: currentScrollPosition(scrollSaving.target) },
		'',
	)
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
	const savedScrollY = (state as Record<string, unknown>)[SCROLL_KEY]
	return typeof savedScrollY === 'number' ? savedScrollY : undefined
}

/**
 * Scrolls `target` (or the window) to a vertical position, without animation.
 *
 * @param y - The offset to scroll to, in pixels.
 * @param target - A custom scroll container. Omit for `window`.
 */
export function scrollToPosition(y: number, target?: Element): void {
	if (!isClient()) return

	if (target) {
		if (y === 0) target.scrollTo?.({ top: 0, behavior: 'instant' })
		else target.scrollTop = y
	}
	else {
		window.scrollTo({ top: y, behavior: 'instant' })
	}
}

/**
 * Scrolls back to the position saved for the history entry you're on, and
 * tells you whether there was one.
 *
 * The router does this for you on back/forward. You only need this for the
 * navigations it deliberately ignores: a back that changes nothing but the
 * query string or the hash isn't a route change, so the router leaves the
 * scroll position alone.
 *
 * ```ts
 * import { href, restoreScrollPosition } from '@rooted/router'
 *
 * on('window', 'popstate', () => {
 *   if (href.current().query.has('page')) restoreScrollPosition()
 * })
 * ```
 *
 * @param target - A custom scroll container. Defaults to the one the router
 *   was mounted with, or `window`.
 * @returns `true` when a saved position was found and scrolled to.
 */
export function restoreScrollPosition(target?: Element): boolean {
	if (!isClient()) return false

	const savedScrollY = getSavedScrollPosition(history.state)
	if (savedScrollY === undefined) return false

	scrollToPosition(savedScrollY, target ?? scrollSaving?.target)
	return true
}

/** Reads where `target` (or the window) is scrolled to right now. */
function currentScrollPosition(target?: Element): number {
	return target ? target.scrollTop : window.scrollY
}
