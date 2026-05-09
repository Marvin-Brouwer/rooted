import { isDevelopment } from '@rooted/util/dev'

import { create } from './component-factory.mts'
import { Component } from './component.mts'

type RootSelector = {
	/** CSS selector for the application root element. Defaults to `#app`. */
	selector: string
} | {
	/** Existing element to use as the application root. */
	element: Element
}

/** Options for {@link application}. */
export type ApplicationOptions = RootSelector

/**
 * Mounts a component as the application root. Replaces the root element on the
 * page with the mounted component.
 *
 * By default looks for an element with id `app`. Pass `options.selector` for a
 * different CSS selector, or `options.element` to hand in an element directly.
 *
 * Throws when the root element isn't found.
 *
 * @example
 * ```ts
 * import { application } from '@rooted/components/application'
 * import { App } from './app.mts'
 *
 * application(App)                          // default: replaces #app
 * application(App, { selector: '#root' })   // custom selector
 * application(App, { element: someNode })   // explicit element
 * ```
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
// eslint-disable-next-line unicorn/prefer-global-this
if (isDevelopment() && typeof window !== 'undefined') {
	// eslint-disable-next-line unicorn/prefer-global-this
	window.addEventListener('error', (errorEvent) => {
		console.error(errorEvent)
	})
	// eslint-disable-next-line unicorn/prefer-global-this
	window.addEventListener('unhandledrejection', (rejectionEvent) => {
		console.error(rejectionEvent)
	})
}
