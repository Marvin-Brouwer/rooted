import { Component } from './component.mts'
import { create } from './element-helper.mts'

/**
 * ## Initialize a new `application`
 *
 * Expects the following element to be present in the body:
 * ```html
 *   <script
 *		  id="app" async defer
 *			type="module" src="/src/main.mts"
 *	 ></script>
 * ```
 *
 * The application will replace the script element.
 */
export function application(component: Component) {
	const script = document.querySelector('script#app')
	if (!script) {
		console.error('Application incorrectly configured')
		return
	}

	const appRoot = create(component)
	script.replaceWith(appRoot)
}