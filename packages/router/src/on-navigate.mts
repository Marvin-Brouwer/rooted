import { NavigateEvent, type NavigateHandler } from './navigate-event.mts'

/**
 * Creates a navigation progress tracker that fires `NavigateEvent`s at the
 * `'start'` and `'end'` lifecycle phases.
 *
 * Call `.stop()` once the route has finished rendering to emit the `'end'` event.
 */
export function createNavigateTracker(href: string, handler: NavigateHandler): { stop(): void } {
	handler(new NavigateEvent('start', href))

	return {
		stop() {
			handler(new NavigateEvent('end', href))
		},
	}
}
