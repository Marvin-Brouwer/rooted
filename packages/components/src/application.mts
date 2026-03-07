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
	const script = document.querySelector('#app')
	if (!script) {
		console.error('Application incorrectly configured')
		return
	}

	const appRoot = create(component)
	script.replaceWith(appRoot)
}