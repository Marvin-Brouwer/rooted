import { component } from '@rooted/components'
import { type Store } from '@rooted/store'

import styles from './navigation-progress.css'

export type NavigationState = 'idle' | 'navigating'

const supportsPerformanceObserver = typeof PerformanceObserver !== 'undefined'
const supportsConnectionInfo = navigator.connection

export type NavigationProgressOptions = {
	href: string
	state: Store<NavigationState>
}
export const NavigationProgress = component<NavigationProgressOptions>({
	name: 'navigation-progress',
	styles,
	onMount({ append, element, options, signal, create }) {
		const { href, state } = options

		const isNavigating = () => state.value === 'navigating'

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
						if (isNavigating()) return
						currentTarget.parentElement?.remove()
					},
					webkittransitionend({ currentTarget }) {
						if (isNavigating()) return
						currentTarget.parentElement?.remove()
					},
				},
				max: 100,
				value: isNavigating() ? 0 : 100,
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
			if (isNavigating()) return

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

		// Complete when state transitions back to idle — covers cached navigations
		// where PerformanceObserver never fires.
		state.on('update', signal, () => {
			if (isNavigating()) return
			handleUpdate()
		})

		append(create(NavigationSpinner, { state }))
	},
})

export type NavigationSpinnerOptions = {
	state: Store<NavigationState>
}
export const NavigationSpinner = component<NavigationSpinnerOptions>({
	name: 'navigation-progress-spinner',
	styles,
	onMount({ replace, element, signal, options }) {
		const { state } = options
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
		if (!signal.aborted && supportsConnectionInfo && navigator.connection!.effectiveType !== '4g')
			dialog.show()

		// Also show on mid-navigation network degradation.
		// Never auto-close on improvement — avoid flashing on flaky connections.
		navigator.connection?.addEventListener('change', () => {
			if (signal.aborted || dialog.open) return
			if (navigator.connection?.effectiveType !== '4g') dialog.show()
		}, { signal })

		// Close immediately when navigation ends — don't wait for the progress bar
		// transition, otherwise the spinner flashes on fast cached navigations.
		state.on('update', signal, () => {
			if (state.value === 'navigating') return
			dialog.close()
		})

		signal.addEventListener('abort', () => dialog.close())
	},
})
