import { component } from '@rooted/components'

import styles from './navigation-progress.css'

const supportsPerformanceObserver = typeof PerformanceObserver !== 'undefined'

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
			// Force reflow so the opacity transition fires from 0 → 1
			progress.getBoundingClientRect()

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
	onMount({ replace, element, options, signal }) {
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

		void computeSpinnerRecommended(href).then((recommended) => {
			if (signal.aborted) return
			if (recommended) dialog.show()
		})

		// Only show on degrading connection — never auto-close to avoid flashing on flaky networks
		const connection = navigator.connection
		if (connection) {
			const onNetworkChange = () => {
				if (signal.aborted || dialog.open) return
				if (connection.effectiveType !== '4g') dialog.show()
			}
			connection.addEventListener('change', onNetworkChange)
			signal.addEventListener('abort', () => connection.removeEventListener('change', onNetworkChange))
		}
	},
})

async function computeSpinnerRecommended(href: string): Promise<boolean> {
	if (typeof window === 'undefined') return false
	if (await isRouteCached(href)) return false

	const networkSlow = navigator.connection?.effectiveType !== '4g'
	const cpuSlow = (navigator.hardwareConcurrency ?? 4) <= 2

	return networkSlow || cpuSlow
}

async function isRouteCached(href: string): Promise<boolean> {
	if (typeof caches === 'undefined') return false
	const response = await caches.match(href, { ignoreSearch: true })
	return response !== undefined
}
