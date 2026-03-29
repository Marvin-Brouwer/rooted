import { isClient } from '@rooted/util'

import { NavigateEvent, type NavigateHandler } from './navigate-event.mts'

/**
 * Creates a navigation progress tracker that fires `NavigateEvent`s at the
 * `'start'`, `'progress'`, and `'end'` lifecycle phases.
 *
 * Call `.stop()` once the route has finished rendering to emit the `'end'`
 * event and tear down any internal observers / timers.
 *
 * Only create a tracker when an `on.navigate` handler is configured —
 * the tracker always runs in the background to observe resource loads.
 *
 * @param routeCached - Pass `true` when the router already has a cached result
 *   for this path, so `spinnerRecommended` is always `false`.
 */
export function createNavigateTracker(href: string, handler: NavigateHandler): { stop(): void } {
	let spinnerRecommended = false
	let stopped = false

	handler(new NavigateEvent('start', false, href))

	// Compute spinnerRecommended async, re-fire progress when done
	computeSpinnerRecommended(href).then((result) => {
		if (stopped) return
		spinnerRecommended = result
		handler(new NavigateEvent('progress', spinnerRecommended, href))
	})

	let cleanup: (() => void) | undefined

	if (isClient() && typeof PerformanceObserver !== 'undefined') {
		const observer = new PerformanceObserver(() => {
			handler(new NavigateEvent('progress', spinnerRecommended, href))
		})
		observer.observe({ type: 'resource', buffered: false })
		cleanup = () => observer.disconnect()
	}
	else if (isClient()) {
		// Fallback: timer-based fake progress
		const id = setInterval(() => {
			handler(new NavigateEvent('progress', spinnerRecommended, href))
		}, 200)
		cleanup = () => clearInterval(id)
	}

	return {
		stop() {
			stopped = true
			cleanup?.()
			handler(new NavigateEvent('end', spinnerRecommended, href))
		},
	}
}

async function computeSpinnerRecommended(href: string): Promise<boolean> {
	if (!isClient()) return false

	if (await isRouteCached(href)) return false

	// Network speed
	const networkSlow = navigator.connection?.effectiveType !== '4g'

	// CPU proxy
	const cpuSlow = (navigator.hardwareConcurrency ?? 4) <= 2

	return networkSlow || cpuSlow
}

async function isRouteCached(href: string): Promise<boolean> {
	if (typeof caches === 'undefined') return false
	const response = await caches.match(href, { ignoreSearch: true })
	return response !== undefined
}
