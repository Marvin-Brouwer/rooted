import { environment } from '@rooted/util'
import { isDevelopment } from '@rooted/util/dev'

import { create } from './component-factory.mts'
import { Component } from './component.mts'
import { markPreRenderedRoot } from './pre-rendered-root.mts'

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
 * Mounts a component as the application root, inside the root element on the page.
 * Whatever the root held before is replaced, the root element itself stays.
 *
 * By default looks for an element with id `app`. Pass `options.selector` for a different CSS selector,
 * or `options.element` to hand in an element directly.
 *
 * The root staying is what makes pre-rendered pages work: the page the build writes still has the root,
 * so the same lookup finds it in the browser, and the app replaces the pre-rendered markup with a freshly mounted one.
 * There's no hydration. Until a lazy route has loaded, that part of the page shows empty.
 *
 * Throws when the root element isn't found.
 *
 * @example
 * ```ts
 * import { application } from '@rooted/components/application'
 * import { App } from './app.mts'
 *
 * application(App)                          // default: mounts inside #app
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
	appRoot.replaceChildren(appComponent)
	markPreRenderedRoot(appRoot, environment.is('preRenderer'))

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
