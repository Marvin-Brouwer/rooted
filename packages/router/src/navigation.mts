import { Path, Url } from './href.mts'
import { saveScrollPosition } from './scroll.mts'

/**
 * The two ways to name a navigation target: a URL to go to, or history state on
 * its own. Shared by {@link navigate} and `navigate.replace`.
 */
export type NavigateCall = {
	/**
	 * Navigate to a path:
	 * ```ts
	 * navigate('/categories/italian/')
	 * ```
	 */
	(href: string | Url | Path): void
	/** @deprecated Use `href.url()` or `href.path()` to construct the target. */
	(href: URL): void
	/**
	 * Write arbitrary history state without changing the URL. Useful for modal
	 * or drawer state that doesn't need its own path:
	 * ```ts
	 * navigate({
	 *   modal: 'confirm',
	 *   id: 42
	 * })
	 * ```
	 */
	<T extends object>(state: T): void
}

/** The shape of {@link navigate}: callable on its own, plus a `replace` sibling. */
export type Navigate = NavigateCall & {
	/**
	 * Overwrites the current history entry instead of adding one, then
	 * re-evaluates the URL the same way {@link navigate} does.
	 *
	 * This is what a redirect wants. If a redirect pushes, Back lands on the
	 * page that redirects and the user gets bounced straight forward again:
	 * ```ts
	 * navigate.replace(href.for(HomeRoute, {
	 *   locale: remembered
	 * }))
	 * ```
	 */
	readonly replace: NavigateCall
}

/**
 * Performs client-side navigation by writing to the browser history and
 * dispatching a `popstate` event so the router re-evaluates the current URL.
 * No full-page reload occurs.
 *
 * Calling `navigate` pushes a new history entry. Call {@link Navigate.replace}
 * to overwrite the current one instead:
 *
 * ```ts
 * navigate('/categories/italian/')
 * navigate.replace('/en/')
 * ```
 *
 * A push saves the current scroll position onto the entry it's leaving, so
 * back restores it. `replace` doesn't, because it overwrites that entry.
 * Switch it off with `scrollBehavior.saveScrollBeforeNavigate: false` on the
 * router.
 *
 * @see {@link Link} for a component that calls `navigate` on click
 */
export const navigate = Object.freeze(Object.assign(
	(hrefOrState: string | Url | Path | URL | object) => write(hrefOrState, false),
	{ replace: (hrefOrState: string | Url | Path | URL | object) => write(hrefOrState, true) },
)) as Navigate

/** Writes to history and tells the router about it. The only difference between push and replace. */
function write(hrefOrState: string | Url | Path | URL | object, replace: boolean): void {
	const href = resolveHref(hrefOrState)
	const state = href === undefined ? hrefOrState : undefined

	if (replace) {
		history.replaceState(state, '', href)
	}
	else {
		// Stamp the entry we're leaving before it's no longer the current one,
		// so back lands where the user left off.
		saveScrollPosition()
		history.pushState(state, '', href)
	}

	globalThis.dispatchEvent(new PopStateEvent('popstate', { state }))
}

/** Returns the target URL, or `undefined` when the argument is history state rather than a destination. */
function resolveHref(hrefOrState: string | Url | Path | URL | object): string | undefined {
	if (typeof hrefOrState === 'string') return hrefOrState
	if (hrefOrState instanceof Path || hrefOrState instanceof Url || hrefOrState instanceof URL) return hrefOrState.href

	return undefined
}
