import type { UnknownRoute } from './route.mts'

/**
 * Fired by the router during a navigation lifecycle.
 *
 * Two lifecycle phases are emitted in order:
 * - `'start'`: navigation has begun
 * - `'end'`: the new route has finished rendering
 */
export class NavigateEvent extends CustomEvent<never> {
	constructor(
		public readonly navigationType: 'start' | 'end',
		public readonly href: string,
	) {
		super('@rooted/router:navigate')
	}
}

/**
 * Passed to the router's `on.error` handler when a route's `resolve` throws. The router renders `notFound` either way.
 *
 * `detail` is the error. Set `event.errorHandled = true` inside your handler to keep the router from passing it on to `reportError` after the handler returns.
 *
 * @example
 * ```ts
 * create(Router, {
 *   on: {
 *     error(event) {
 *       telemetry.track('route-failed', { href: event.href, message: event.detail.message })
 *       event.errorHandled = true
 *     },
 *   },
 * })
 * ```
 */
export class NavigationErrorEvent extends CustomEvent<Error> {
	public errorHandled = false

	constructor(
		error: Error,
		public readonly route: UnknownRoute,
		public readonly href: string,
	) {
		super('router:error', { detail: error })
	}
}

/** Handler called for every {@link NavigateEvent} emitted during navigation. */
export type NavigateHandler = (event: NavigateEvent) => void

/** Handler called when a route's `resolve` function throws. */
export type ErrorHandler = (event: NavigationErrorEvent) => void
