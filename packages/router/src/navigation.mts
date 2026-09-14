import { Path, Url } from './href.mts'

/**
 * Options for {@link navigate}.
 */
export type NavigateOptions = {
	/**
	 * Replace the current history entry instead of pushing a new one.
	 *
	 * This is what a redirect wants. If a redirect pushes, Back lands on the page
	 * that redirects and the user gets bounced straight forward again.
	 *
	 * Defaults to `false`.
	 */
	replace?: boolean
}

/**
 * Performs client-side navigation by writing to the browser history and
 * dispatching a `popstate` event so the router re-evaluates the current URL.
 * No full-page reload occurs.
 *
 * **URL navigation.** Push a new path into history:
 * ```ts
 * navigate('/categories/italian/')
 * ```
 *
 * **State-only.** Push arbitrary history state without changing the URL.
 * Useful for modal or drawer state that doesn't need its own path:
 * ```ts
 * navigate({ modal: 'confirm', id: 42 })
 * ```
 *
 * Both take an optional {@link NavigateOptions}. Pass `replace` to overwrite the
 * current history entry instead of adding one, which is what you want for a
 * redirect:
 * ```ts
 * navigate(href.for(HomeRoute, { locale: remembered }), { replace: true })
 * ```
 *
 * @see {@link Link} for a component that calls `navigate` on click
 */
export function navigate(href: string | Url | Path, options?: NavigateOptions): void
/** @deprecated */
export function navigate(href: URL, options?: NavigateOptions): void
export function navigate<T extends object>(state: T, options?: NavigateOptions): void
export function navigate(hrefOrState: string | Url | Path | URL | object, options?: NavigateOptions): void {
	const href = resolveHref(hrefOrState)
	const state = href === undefined ? hrefOrState : undefined

	if (options?.replace === true) history.replaceState(state, '', href)
	else history.pushState(state, '', href)

	globalThis.dispatchEvent(new PopStateEvent('popstate', { state }))
}

/** Returns the target URL, or `undefined` when the argument is history state rather than a destination. */
function resolveHref(hrefOrState: string | Url | Path | URL | object): string | undefined {
	if (typeof hrefOrState === 'string') return hrefOrState
	if (hrefOrState instanceof Path || hrefOrState instanceof Url || hrefOrState instanceof URL) return hrefOrState.href

	return undefined
}
