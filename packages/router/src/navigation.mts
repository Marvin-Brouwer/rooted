
/**
 * Performs client-side navigation by pushing to the browser history and
 * dispatching a `popstate` event so the router re-evaluates the current URL —
 * no full-page reload occurs.
 *
 * Two overloads are supported:
 *
 * **URL navigation** — push a new path into history:
 * ```ts
 * navigate('/categories/italian/')
 * ```
 *
 * **State-only** — push arbitrary history state without changing the URL
 * (useful for modal/drawer state that does not need its own path):
 * ```ts
 * navigate({ modal: 'confirm', id: 42 })
 * ```
 *
 * @see {@link Link} for a component that calls `navigate` on click
 */
export function navigate<T extends {}>(state: T): void
export function navigate(href: string): void
export function navigate(hrefOrState: string | object): void {
	if (typeof hrefOrState === 'string') {
		history.pushState(null, '', hrefOrState)
		window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
	} else {
		history.pushState(hrefOrState, '', null)
		window.dispatchEvent(new PopStateEvent('popstate', { state: hrefOrState }))
	}
}