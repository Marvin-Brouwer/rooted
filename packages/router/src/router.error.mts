import { reportError } from '@rooted/util'

import { NavigationErrorEvent } from './navigate-event.mts'

import type { ErrorHandler } from './navigate-event.mts'
import type { AnyRoute } from './route.mts'

/**
 * Tells the app a route's `resolve` threw.
 *
 * Calls `handler` with a {@link NavigationErrorEvent}. Unless the handler sets `errorHandled`, the error is also reported globally,
 * so it shows up on `window`'s `error` event. A handler that throws is reported the same way instead of breaking the navigation.
 */
export function reportRouteError(handler: ErrorHandler | undefined, error: Error, route: AnyRoute, href: string) {
	const event = new NavigationErrorEvent(error, route, href)

	try {
		handler?.(event)
	}
	catch (handlerError) {
		reportError(handlerError)
	}

	if (!event.errorHandled) reportError(error)
}
