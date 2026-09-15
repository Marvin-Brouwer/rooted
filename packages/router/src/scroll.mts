import { isClient } from '@rooted/util'

const SCROLL_KEY = '@rooted/scrollY'

/**
 * The routers currently asking for their scroll position to be saved, by id.
 *
 * A router instance can't go into `history.state`, and neither can the element
 * it scrolls, but an instance has identity. So each one gets a stable id on
 * mount and the id is what ends up on the history entry, the same trick the
 * store's hashing uses for function references.
 *
 * A router that isn't in here saves nothing and restores nothing, which is how
 * `scrollBehavior.saveScrollBeforeNavigate: false` switches the whole thing off.
 */
const activeRouters = new Map<string, { target?: Element }>()
let nextRouterIdentity = 0

/** What the browser had `history.scrollRestoration` set to before the first router took over. */
let browserScrollRestoration: ScrollRestoration | undefined

/** A router's place in the scroll registry. Hand {@link ScrollRegistration.unregister} to the mount signal. */
export type ScrollRegistration = {
	/** The id this router's position is stored under, in `history.state`. */
	id: string
	/** Takes the router back out of the registry, and gives the browser scroll restoration back. */
	unregister(): void
}

/**
 * Signs a router up for scroll saving and says which element scrolls for it.
 *
 * While at least one router is registered, `history.scrollRestoration` is
 * `'manual'`: we restore scroll ourselves and don't want the browser doing it
 * too. The browser's own value goes back when the last one unregisters.
 *
 * @param target - A custom scroll container. Omit for `window`.
 */
export function registerScrollSaving(target?: Element): ScrollRegistration {
	const id = `router#${++nextRouterIdentity}`
	activeRouters.set(id, { target })

	if (isClient() && activeRouters.size === 1) {
		browserScrollRestoration = history.scrollRestoration
		history.scrollRestoration = 'manual'
	}

	return {
		id,
		unregister() {
			activeRouters.delete(id)
			if (isClient() && activeRouters.size === 0 && browserScrollRestoration !== undefined) {
				history.scrollRestoration = browserScrollRestoration
				browserScrollRestoration = undefined
			}
		},
	}
}

/**
 * Saves where every registered router is scrolled to, onto the current history
 * entry, so it can be restored when the user comes back to it.
 *
 * Does nothing when no router is registered.
 *
 * Uses `history.replaceState` which does **not** dispatch a `popstate` event,
 * so this is safe to call freely without interfering with other listeners.
 */
export function saveScrollPositions(): void {
	if (!isClient() || activeRouters.size === 0) return

	const positions: Record<string, number> = {}
	for (const [id, { target }] of activeRouters) {
		positions[id] = target ? target.scrollTop : window.scrollY
	}

	history.replaceState({ ...history.state, [SCROLL_KEY]: positions }, '')
}

/**
 * Reads the position saved for one router from a `history.state` object.
 *
 * Returns `undefined` when nothing was saved for it: the initial page load, a
 * push navigation the router wasn't registered for, or an entry written before
 * the router mounted.
 */
export function getSavedScrollPosition(state: unknown, routerId: string): number | undefined {
	if (state === null || typeof state !== 'object') return undefined

	const positions = (state as Record<string, unknown>)[SCROLL_KEY]
	if (positions === null || typeof positions !== 'object') return undefined

	const savedScrollY = (positions as Record<string, unknown>)[routerId]
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
 * Scrolls every mounted router back to the position saved for it on the
 * history entry you're on, and tells you whether any of them had one.
 *
 * The router does this for you on back/forward. You only need it for the
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
 * Returns `false` when nothing was saved, which includes every router having
 * `scrollBehavior.saveScrollBeforeNavigate: false`.
 */
export function restoreScrollPosition(): boolean {
	if (!isClient()) return false

	let restored = false
	for (const [id, { target }] of activeRouters) {
		const savedScrollY = getSavedScrollPosition(history.state, id)
		if (savedScrollY === undefined) continue

		scrollToPosition(savedScrollY, target)
		restored = true
	}

	return restored
}
