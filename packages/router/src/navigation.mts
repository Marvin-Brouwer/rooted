
/**
 * @todo Write documentation
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