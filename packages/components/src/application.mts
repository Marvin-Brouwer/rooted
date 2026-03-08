import { Component } from './component.mts'
import { create } from './element-factory.mts'

type RootSelector = {
	/** CSS selector for the application root element. Defaults to `#app`. */
	selector: string
} | {
	/** Existing element to use as the application root. */
	element: Element
}

export type ApplicationOptions =
	& RootSelector

/**
 * ## Initialize a new `application`
 *
 * By default expects an element of id `app` in the document body.
 * Use `options.selector` to specify a different CSS selector,
 * or `options.element` to pass an element directly.
 *
 * The application will replace the root element.
 */
export function application<T extends Component>(component: T, options?: ApplicationOptions) {
	const appRoot = options && 'element' in options && options.element
		? options.element
		: document.querySelector((options && 'selector' in options && options.selector) || '#app')

	if (!appRoot) throw new Error('[rooted] Application root not found in document.')
	const appComponent = create(component)
	appRoot.replaceWith(appComponent)

	return appComponent
}