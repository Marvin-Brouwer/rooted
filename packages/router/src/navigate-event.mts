import type { Route } from './route.mts'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Fired by the router during a navigation lifecycle.
 *
 * Two lifecycle phases are emitted in order:
 * - `'start'` — navigation has begun
 * - `'end'`   — the new route has finished rendering
 */
export class NavigateEvent extends CustomEvent<never> {
	constructor(
		public readonly navigationType: 'start' | 'end',
		public readonly href: string,
	) {
		super('router:navigate')
	}
}

/**
 * Fired by the router when a route's `resolve` function throws.
 *
 * Set `event.errorHandled = true` inside your handler to prevent the error
 * from being re-thrown after the handler returns.
 */
export class NavigationErrorEvent extends CustomEvent<Error> {
	public errorHandled = false

	constructor(
		error: Error,
		public readonly route: Route<any>,
		public readonly href: string,
	) {
		super('router:error', { detail: error })
	}
}

/** Handler called for every {@link NavigateEvent} emitted during navigation. */
export type NavigateHandler = (event: NavigateEvent) => void

/** Handler called when a route's `resolve` function throws. */
export type ErrorHandler = (event: NavigationErrorEvent) => void
