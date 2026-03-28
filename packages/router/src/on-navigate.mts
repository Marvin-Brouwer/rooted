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
 */
export function createNavigateTracker(href: string, handler: NavigateHandler): { stop(): void } {
	let spinnerRecommended = false

	handler(new NavigateEvent('start', false, href))

	// Compute spinnerRecommended async, re-fire progress when done
	computeSpinnerRecommended(href).then(result => {
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
	} else if (isClient()) {
		// Fallback: timer-based fake progress
		const id = setInterval(() => {
			handler(new NavigateEvent('progress', spinnerRecommended, href))
		}, 200)
		cleanup = () => clearInterval(id)
	}

	return {
		stop() {
			cleanup?.()
			handler(new NavigateEvent('end', spinnerRecommended, href))
		},
	}
}

async function computeSpinnerRecommended(href: string): Promise<boolean> {
	if (!isClient()) return false

	// 1. Primary cache check: route URL in performance timeline
	const isCachedPrimary = performance.getEntriesByName(href).length > 0

	// 2. Fallback cache check: only-if-cached fetch
	const isCached = isCachedPrimary || await (async () => {
		try {
			const res = await fetch(href, { method: 'HEAD', cache: 'only-if-cached', mode: 'same-origin' })
			return res.ok
		} catch { return false }
	})()

	if (isCached) return false

	// 3. Network speed
	const networkSlow = (navigator as any).connection?.effectiveType !== '4g' // eslint-disable-line @typescript-eslint/no-explicit-any

	// 4. CPU proxy
	const cpuSlow = (navigator.hardwareConcurrency ?? 4) <= 2

	return networkSlow || cpuSlow
}
