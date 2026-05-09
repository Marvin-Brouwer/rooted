import { Path, Url } from './href.mts'

/**
 * Performs client-side navigation by pushing to the browser history and
 * dispatching a `popstate` event so the router re-evaluates the current URL.
 * No full-page reload occurs.
 *
 * Two overloads:
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
 * @see {@link Link} for a component that calls `navigate` on click
 */
export function navigate(href: string | Url | Path): void
/** @deprecated */
export function navigate(href: URL): void
export function navigate<T extends object>(state: T): void
export function navigate(hrefOrState: string | Url | Path | URL | object): void {
	if (hrefOrState instanceof Path) {
		history.pushState(undefined, '', hrefOrState.href)
		globalThis.dispatchEvent(new PopStateEvent('popstate', { state: undefined }))
		return
	}
	if (hrefOrState instanceof Url) {
		history.pushState(undefined, '', hrefOrState.href)
		globalThis.dispatchEvent(new PopStateEvent('popstate', { state: undefined }))
		return
	}
	if (hrefOrState instanceof URL) {
		history.pushState(undefined, '', hrefOrState.href)
		globalThis.dispatchEvent(new PopStateEvent('popstate', { state: undefined }))
		return
	}
	if (typeof hrefOrState === 'string') {
		history.pushState(undefined, '', hrefOrState)
		globalThis.dispatchEvent(new PopStateEvent('popstate', { state: undefined }))
		return
	}

	history.pushState(hrefOrState, '')
	globalThis.dispatchEvent(new PopStateEvent('popstate', { state: hrefOrState }))
}
