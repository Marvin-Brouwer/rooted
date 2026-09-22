import { environment } from '@rooted/util'

import { savedNavigationState, saveToNavigationEntry, startTraverseSaving } from './scroll.navigation.mts'

/** Namespace for the router's own state on a history entry, keyed by router id inside it. */
const ROUTER_KEY = '@rooted/router'

/**
 * Where something is scrolled to, both axes, in the usual x then y order.
 *
 * Both are labelled, so you don't have to come back here to check which way round they go.
 */
export type ScrollOffset = [x: number, y: number]

/** Every registered router's offset, by id. This is what a history entry carries under `@rooted/router`. */
export type RouterScrollState = Record<string, ScrollOffset>

/**
 * The routers currently asking for their scroll offset to be saved, by id.
 *
 * A router instance can't go into `history.state`, and neither can the element it scrolls, but an instance has identity.
 * So each one gets a stable id on mount and the id is what ends up on the history entry,
 * the same trick the store's hashing uses for function references.
 *
 * A router that isn't in here saves nothing and restores nothing,
 * which is how `scrollBehavior.saveScrollBeforeNavigate: false` switches the whole thing off.
 */
const activeRouters = new Map<string, { target?: Element }>()
let nextRouterIdentity = 0

/** What the browser had `history.scrollRestoration` set to before the first router took over. */
let browserScrollRestoration: ScrollRestoration | undefined

/** Stops saving on back/forward. Set while any router is registered, on browsers that have the Navigation API. */
let stopTraverseSaving: (() => void) | undefined

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
 * While at least one router is registered, `history.scrollRestoration` is `'manual'`:
 * we restore scroll ourselves and don't want the browser doing it too.
 * The browser's own value goes back when the last one unregisters.
 *
 * @param target - A custom scroll container. Omit for `window`.
 */
export function registerScrollSaving(target?: Element): ScrollRegistration {
	const id = `#${++nextRouterIdentity}`
	activeRouters.set(id, { target })

	if (environment.hasDom && activeRouters.size === 1) {
		browserScrollRestoration = history.scrollRestoration
		history.scrollRestoration = 'manual'
		stopTraverseSaving = startTraverseSaving(currentOffsets)
	}

	return {
		id,
		unregister() {
			activeRouters.delete(id)
			if (environment.hasDom && activeRouters.size === 0 && browserScrollRestoration !== undefined) {
				history.scrollRestoration = browserScrollRestoration
				browserScrollRestoration = undefined
				stopTraverseSaving?.()
				stopTraverseSaving = undefined
			}
		},
	}
}

/**
 * Saves where every registered router is scrolled to, onto the current history entry,
 * so it can be restored when the user comes back to it.
 *
 * Does nothing when no router is registered.
 *
 * Uses `history.replaceState` which does **not** dispatch a `popstate` event,
 * so this is safe to call freely without interfering with other listeners.
 */
export function saveScrollOffsets(): void {
	if (!environment.hasDom || activeRouters.size === 0) return

	const offsets = currentOffsets()
	history.replaceState({ ...history.state, [ROUTER_KEY]: offsets }, '')
	// Keep both stores in step, so the Navigation API one is never the staler
	// of the two and {@link currentEntryState} can just prefer it.
	saveToNavigationEntry(offsets)
}

/** Where every registered router is scrolled to, right now. */
function currentOffsets(): RouterScrollState {
	const offsets: RouterScrollState = {}
	for (const [id, { target }] of activeRouters) {
		offsets[id] = target
			? [target.scrollLeft, target.scrollTop]
			: [window.scrollX, window.scrollY]
	}

	return offsets
}

/**
 * The state to read saved offsets from.
 *
 * The Navigation API's entry state when the browser has one, because that's the only store a back or forward can write to,
 * and it's kept at least as fresh as `history.state`. Falls back to `history.state`, which is all there is on a browser without the Navigation API,
 * and all an entry carries before the router has saved to it.
 */
export function currentEntryState(): unknown {
	if (!environment.hasDom) return undefined
	return savedNavigationState() ?? history.state
}

/**
 * Reads the offset saved for one router from a `history.state` object.
 *
 * Returns `undefined` when nothing was saved for it: the initial page load, a push navigation the router wasn't registered for,
 * or an entry written before the router mounted.
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
export function scrollToOffset([x, y]: ScrollOffset, target?: Element): void {
	if (!environment.hasDom) return

	if (target) {
		if (x === 0 && y === 0) target.scrollTo?.({ top: 0, left: 0, behavior: 'instant' })
		else {
			target.scrollLeft = x
			target.scrollTop = y
		}
	}
	else {
		window.scrollTo({ top: y, left: x, behavior: 'instant' })
	}
}

/** How many animation frames a restore keeps re-applying the offset before giving up. */
const RESTORE_FRAME_BUDGET = 20

/**
 * Scrolls to a saved offset, re-applying it for a few frames.
 *
 * A route mounts into the DOM empty and fills in asynchronously,
 * so straight after a render the document is usually still too short for the saved offset and the browser clamps the scroll to whatever currently fits.
 * There's no "this route has finished rendering" signal to wait on, components mount async all the way down,
 * so this re-applies the offset each frame until it sticks, then stops.
 *
 * The budget is there so a page that will never be that tall (a shorter route at the same URL,
 * content that failed to load) stops being scrolled rather than being fought every frame forever.
 * In the recipe-book example the content arrives within three frames.
 *
 * The cost of the approach: for those few frames the scroll keeps being asserted,
 * so someone who scrolls in the moment right after pressing back gets overridden once.
 *
 * @param offset - Where to scroll to. See {@link ScrollOffset}.
 * @param target - A custom scroll container. Omit for `window`.
 */
export function restoreScrollOffset(offset: ScrollOffset, target?: Element): void {
	if (!environment.hasDom) return

	let framesLeft = RESTORE_FRAME_BUDGET

	function attempt() {
		scrollToOffset(offset, target)
		if (reachedOffset(offset, target) || --framesLeft <= 0) return
		requestAnimationFrame(attempt)
	}

	attempt()
}

/** Whether the scroll actually landed on `offset`, or the browser clamped it short because the page is too small. */
function reachedOffset([x, y]: ScrollOffset, target?: Element): boolean {
	const [currentX, currentY] = target
		? [target.scrollLeft, target.scrollTop]
		: [window.scrollX, window.scrollY]

	return Math.round(currentX) === x && Math.round(currentY) === y
}

/**
 * Scrolls every mounted router back to the offset saved for it on the history entry you're on,
 * and tells you whether any of them had one.
 *
 * The router does this for you on back/forward. You only need it for the navigations it deliberately ignores:
 * a back that changes nothing but the query string or the hash isn't a route change,
 * so the router leaves the scroll position alone.
 *
 * ```ts
 * import { href, restoreScrollPosition } from '@rooted/router'
 *
 * on('window', 'popstate', () => {
 *   if (href.current().query.has('page')) restoreScrollPosition()
 * })
 * ```
 *
 * Returns `false` when nothing was saved, which includes every router having `scrollBehavior.saveScrollBeforeNavigate: false`.
 */
export function restoreScrollPosition(): boolean {
	if (!environment.hasDom) return false

	const state = currentEntryState()

	let restored = false
	for (const [id, { target }] of activeRouters) {
		const offset = getSavedScrollOffset(state, id)
		if (offset === undefined) continue

		restoreScrollOffset(offset, target)
		restored = true
	}

	return restored
}
