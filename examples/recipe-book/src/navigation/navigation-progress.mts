import { component } from '@rooted/components'

import styles from './navigation-progress.css'

const supportsPerformanceObserver = typeof PerformanceObserver !== 'undefined'

// Track network slow/fast state at module level via 'change' events so it persists
// accurately across navigations. Reading effectiveType at navigation-start time is
// unreliable: the browser's estimate can lag behind after throttle changes.
const _connection = typeof navigator !== 'undefined' ? navigator.connection : undefined
let networkKnownSlow = _connection != null && _connection.effectiveType !== '4g'
if (_connection) {
	_connection.addEventListener('change', () => {
		networkKnownSlow = _connection.effectiveType !== '4g'
	})
}

export type NavigationProgressOptions = {
	href: string
	state: { done: boolean }
}
export const NavigationProgress = component<NavigationProgressOptions>({
	name: 'navigation-progress',
	styles,
	onMount({ append, element, options, signal }) {
		const { href, state } = options

		const [announcer, progress] = append(
			element('div', {
				role: 'status',
				aria: {
					live: 'polite',
					atomic: 'true',
				},
				classes: styles.srOnly,
				textContent: `Loading ${href}\u2026`,
			}),
			element('progress', {
				classes: [
					styles.progressWrapper,
					styles.active,
				],
				aria: {
					// TODO, better aria-type
					hidden: 'true',
				},
				on: {
					transitionend({ currentTarget }) {
						if (!state.done) return
						currentTarget.parentElement?.remove()
					},
					webkittransitionend({ currentTarget }) {
						if (!state.done) return
						currentTarget.parentElement?.remove()
					},
				},
				max: 100,
				value: state.done ? 100 : 0,
			}),
		)

		function increment() {
			const currentValue = progress.value
			progress.value = currentValue === 0
				? Math.random() * 30
				: currentValue + Math.random() * (90 - currentValue)

			handleUpdate()
		}
		const id = setInterval(handleUpdate, 200)
		function handleUpdate() {
			// Force reflow so the opacity transition fires from 0 → 1
			progress.getBoundingClientRect()
			if (!state.done) return

			progress.value = 100
			announcer.textContent = `Finished loading ${href}\u2026`
			requestAnimationFrame(() => progress.className = styles.progressWrapper as string)
			clearInterval(id)
		}

		signal.addEventListener('abort', () => clearInterval(id))

		if (supportsPerformanceObserver) {
			const observer = new PerformanceObserver(increment)
			observer.observe({ type: 'resource', buffered: false })
			signal.addEventListener('abort', observer.disconnect.bind(observer))
		}
		else {
			const id = setInterval(increment, 200)
			signal.addEventListener('abort', () => clearInterval(id))
		}

		// Fallback for cached navigations: PerformanceObserver never fires when no
		// resources are loaded, so poll state.done directly to ensure the bar always completes.
		const completionId = setInterval(() => {
			if (!state.done) return
			clearInterval(completionId)
			handleUpdate()
		}, 50)
		signal.addEventListener('abort', () => clearInterval(completionId))
	},
})

export type NavigationSpinnerOptions = {
	href: string
}
export const NavigationSpinner = component<NavigationSpinnerOptions>({
	name: 'navigation-progress-spinner',
	styles,
	async onMount({ replace, element, options, signal }) {
		const { href } = options

		const dialog = replace(element('dialog', {
			classes: styles.spinnerOverlay,
			children: [
				element('div', {
					classes: styles.spinnerCard,
					children: [
						element('div', {
							classes: styles.dotPulse,
							children: [element('span'), element('span'), element('span')],
						}),
						element('p', {
							classes: styles.spinnerLabel,
							textContent: 'loading\u2026',
						}),
					],
				}),
			],
		}))

		signal.addEventListener('abort', () => dialog.close())

		async function checkSpinnerRecommended() {
			if (signal.aborted || dialog.open) return
			const recommended = await computeSpinnerRecommended(href)
			if (signal.aborted || dialog.open) return
			if (recommended) dialog.show()
		}

		// Only show on degrading connection — never auto-close to avoid flashing on flaky networks.
		// When routing ends the signal aborts, closing the dialog and resetting state for the next navigation.
		navigator.connection?.addEventListener('change', () => {
			if (navigator.connection?.effectiveType === '4g') return
			void checkSpinnerRecommended()
		}, { signal })
		await checkSpinnerRecommended()
	},
})

async function computeSpinnerRecommended(href: string): Promise<boolean> {
	if (globalThis.window === undefined) return false
	if (await isRouteCached(href)) return false

	const cpuSlow = (navigator.hardwareConcurrency ?? 4) <= 2

	return networkKnownSlow || cpuSlow
}

async function isRouteCached(href: string): Promise<boolean> {
	if (typeof caches === 'undefined') return false
	const response = await caches.match(href, { ignoreSearch: true })
	return response !== undefined
}
