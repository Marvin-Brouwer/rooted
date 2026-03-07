import { Component } from './component.mts'
import { create } from './element-helper.mts'

/**
 * ## Initialize a new `application`
 *
 * Expects an element of id `app` in the document body.
 *
 * The application will replace the `#app` element.
 */
export function application(component: Component) {
	const appRoot = document.querySelector('#app')
	if (!appRoot) throw new Error('[rooted] Application root #app not found in document.')
	appRoot.replaceWith(create(component))
}