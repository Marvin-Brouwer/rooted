import { isClient } from '@rooted/util'

import type { RouterScrollState } from './scroll.mts'

/** Namespace for the router's own state on a history entry, keyed by router id inside it. */
const ROUTER_KEY = '@rooted/router'

/**
 * Whether this browser has the Navigation API.
 *
 * Everything in here is a progressive enhancement. Without it the router still
 * saves scroll offsets, just only on push navigations, which leaves back and
 * forward reading whatever the last push wrote.
 */
function hasNavigationApi(): boolean {
	return isClient() && 'navigation' in globalThis
}

/**
 * Writes scroll offsets onto the entry the browser is on, without navigating.
 *
 * This deliberately doesn't use `history.replaceState`. Called during a
 * `navigate` event for a traversal, `replaceState` silently cancels the
 * traversal: back stops working and you stay on the page you were on. Verified
 * in Chromium, not a spec reading. `updateCurrentEntry` is the supported way to
 * change an entry's state without it counting as a navigation.
 *
 * The state it writes is the Navigation API's own per-entry store, which is
 * separate from `history.state`. {@link savedNavigationState} reads it back.
 */
export function saveToNavigationEntry(offsets: RouterScrollState): void {
	if (!hasNavigationApi()) return

	const entry = navigation.currentEntry
	if (!entry) return

	const state = entry.getState()
	const existing = state !== null && typeof state === 'object' ? state : {}

	navigation.updateCurrentEntry({ state: { ...existing, [ROUTER_KEY]: offsets } })
}

/** Reads the Navigation API state for the entry we're on, or `undefined` when the browser has no Navigation API. */
export function savedNavigationState(): unknown {
	if (!hasNavigationApi()) return undefined
	return navigation.currentEntry?.getState()
}

/**
 * Saves scroll offsets whenever the browser is about to leave the current entry
 * by back or forward, and hands back the function that stops doing that.
 *
 * This is the half that a push navigation can't cover. `navigate` saves the
 * entry it pushes away from, but a traversal never goes through `navigate`, so
 * without this an entry only ever carries the offset it had when it was last
 * pushed away from, which goes stale as soon as you start using back and
 * forward.
 *
 * The `navigate` event fires before the traversal commits, so the entry being
 * written is still the one being left.
 */
export function startTraverseSaving(currentOffsets: () => RouterScrollState): () => void {
	if (!hasNavigationApi()) return () => {}

	function onNavigate(event: NavigateEvent) {
		// A push already saved through `navigate`, and a replace overwrites the
		// entry it's on, so there's nothing worth keeping for either.
		if (event.navigationType !== 'traverse') return
		saveToNavigationEntry(currentOffsets())
	}

	navigation.addEventListener('navigate', onNavigate)
	return () => navigation.removeEventListener('navigate', onNavigate)
}
