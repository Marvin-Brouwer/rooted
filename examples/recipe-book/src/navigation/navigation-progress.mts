import { component } from '@rooted/components'
import { type Store } from '@rooted/store'

import styles from './navigation-progress.css'

const supportsPerformanceObserver = typeof PerformanceObserver !== 'undefined'

export type NavigationProgressOptions = {
	href: string
	state: Store<Record<string, { done: boolean }>>
}
export const NavigationProgress = component<NavigationProgressOptions>({
	name: 'navigation-progress',
	styles,
	onMount({ append, element, options, signal }) {
		const { href, state } = options

		const isDone = () => state.value[href]?.done === true

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
						if (!isDone()) return
						currentTarget.parentElement?.remove()
					},
					webkittransitionend({ currentTarget }) {
						if (!isDone()) return
						currentTarget.parentElement?.remove()
					},
				},
				max: 100,
				value: isDone() ? 100 : 0,
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
			if (!isDone()) return

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

		// Subscribe to store updates so cached navigations (where PerformanceObserver
		// never fires) still complete the bar without polling.
		state.on('update', signal, () => {
			if (!isDone()) return
			handleUpdate()
		})
	},
})


export const NavigationSpinner = component({
	name: 'navigation-progress-spinner',
	styles,
	onMount({ replace, element, signal }) {
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

		// Show immediately if connection is already degraded
		if (!signal.aborted && navigator.connection != null && navigator.connection.effectiveType !== '4g')
			dialog.show()

		// Also show on mid-navigation network degradation.
		// Never auto-close on improvement — avoid flashing on flaky connections.
		// When routing ends the signal aborts, resetting state for the next navigation.
		navigator.connection?.addEventListener('change', () => {
			if (signal.aborted || dialog.open) return
			if (navigator.connection?.effectiveType !== '4g') dialog.show()
		}, { signal })

		signal.addEventListener('abort', () => dialog.close())
	},
})
