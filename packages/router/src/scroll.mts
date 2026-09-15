import { isClient } from '@rooted/util'

/** Namespace for the router's own state on a history entry, keyed by router id inside it. */
const ROUTER_KEY = '@rooted/router'

/**
 * Where something is scrolled to, both axes.
 *
 * Vertical first, because that's the one you nearly always care about, and
 * both are labelled so you don't have to come back here to check.
 */
export type ScrollOffset = [y: number, x: number]

/**
 * The routers currently asking for their scroll offset to be saved, by id.
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
	/** The id this router's offset is stored under, inside the entry's `@rooted/router` state. */
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
	const id = `#${++nextRouterIdentity}`
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
export function saveScrollOffsets(): void {
	if (!isClient() || activeRouters.size === 0) return

	const offsets: Record<string, ScrollOffset> = {}
	for (const [id, { target }] of activeRouters) {
		offsets[id] = target
			? [target.scrollTop, target.scrollLeft]
			: [window.scrollY, window.scrollX]
	}

	history.replaceState({ ...history.state, [ROUTER_KEY]: offsets }, '')
}

/**
 * Reads the offset saved for one router from a `history.state` object.
 *
 * Returns `undefined` when nothing was saved for it: the initial page load, a
 * push navigation the router wasn't registered for, or an entry written before
 * the router mounted.
 */
export function getSavedScrollOffset(state: unknown, routerId: string): ScrollOffset | undefined {
	if (state === null || typeof state !== 'object') return undefined

	const routerState = (state as Record<string, unknown>)[ROUTER_KEY]
	if (routerState === null || typeof routerState !== 'object') return undefined

	const offset = (routerState as Record<string, unknown>)[routerId]
	if (!Array.isArray(offset) || offset.length !== 2) return undefined
	if (typeof offset[0] !== 'number' || typeof offset[1] !== 'number') return undefined

	return [offset[0], offset[1]]
}

/**
 * Scrolls `target` (or the window) to an offset, without animation.
 *
 * @param offset - Where to scroll to. See {@link ScrollOffset}.
 * @param target - A custom scroll container. Omit for `window`.
 */
export function scrollToOffset([y, x]: ScrollOffset, target?: Element): void {
	if (!isClient()) return

	if (target) {
		if (y === 0 && x === 0) target.scrollTo?.({ top: 0, left: 0, behavior: 'instant' })
		else {
			target.scrollTop = y
			target.scrollLeft = x
		}
	}
	else {
		window.scrollTo({ top: y, left: x, behavior: 'instant' })
	}
}

/**
 * Scrolls every mounted router back to the offset saved for it on the history
 * entry you're on, and tells you whether any of them had one.
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
		const offset = getSavedScrollOffset(history.state, id)
		if (offset === undefined) continue

		scrollToOffset(offset, target)
		restored = true
	}

	return restored
}
