import { component } from '@rooted/components'

import styles from './route-progress.css'

const supportsPerformanceObserver = typeof PerformanceObserver !== 'undefined'

export type RouteProgressOptions = {
	href: string
	state: { done: boolean }
}
export const RouteProgress = component<RouteProgressOptions>({
	name: 'route-progress',
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

		function handleUpdate() {
			// Force reflow so the opacity transition fires from 0 → 1
			progress.getBoundingClientRect()

			if (state.done) {
				progress.value = 100
				announcer.textContent = `Finished loading ${href}\u2026`
				requestAnimationFrame(() => progress.className = styles.progressWrapper as string)
				return
			}

			const currentValue = progress.value
			progress.value = currentValue === 0
				? Math.random() * 30
				: currentValue + Math.random() * (90 - currentValue)
		}

		// Start remove immediately if mounted on 100%
		if (state.done) {
			handleUpdate()
			return
		}

		if (supportsPerformanceObserver) {
			const observer = new PerformanceObserver(handleUpdate)
			observer.observe({ type: 'resource', buffered: false })
			signal.addEventListener('abort', observer.disconnect.bind(observer))
		}
		else {
			const id = setInterval(handleUpdate, 200)
			signal.addEventListener('abort', () => clearInterval(id))
		}
	},
})
