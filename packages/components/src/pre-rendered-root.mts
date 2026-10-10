const preRenderedAttribute = 'data-rooted-prerendered'

/**
 * @internal
 * Puts the mark on the application root while pre-rendering, and takes it off once the app has taken the root over in a browser.
 *
 * The pre-render serializes the page with the mark on, so the component hosts it wrote can tell they're leftovers.
 */
export function markPreRenderedRoot(root: Element, preRendering: boolean) {
	root.toggleAttribute(preRenderedAttribute, preRendering)
}

/**
 * @internal
 * Whether `element` sits in a root the pre-render wrote, which `application()` hasn't taken over yet.
 */
export function isInPreRenderedRoot(element: Element) {
	return element.closest(`[${preRenderedAttribute}]`) !== null
}
