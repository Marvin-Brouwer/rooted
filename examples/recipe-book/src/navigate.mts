/**
 * SPA navigation: push a new URL and fire `popstate` so the router re-evaluates.
 */
export function navigate(href: string) {
	history.pushState(null, '', href)
	window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
}

/**
 * Creates an `<a>` element that navigates without a full page reload.
 * The click listener is automatically cleaned up when `signal` aborts.
 */
export function navLink(href: string, text: string, signal: AbortSignal): HTMLAnchorElement {
	const a = document.createElement('a')
	a.href = href
	a.textContent = text
	a.addEventListener('click', (e) => {
		e.preventDefault()
		navigate(href)
	}, { signal })
	return a
}
