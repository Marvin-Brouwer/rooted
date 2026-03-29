import { component, cssClass } from '@rooted/components'

import styles from './route-progress.css'

export type ProgressState = Record<string, { progress: number, done: boolean }>

export const RouteProgress = component<{ progressState: ProgressState }>({
	name: 'route-progress',
	styles,
	onMount({ replace, create, options, signal }) {
		const { progressState } = options

		const intervalId = setInterval(() => {
			replace(...Object
				.keys(progressState)
				.map(href => create(ProgressBar, { href, progressState })),
			)
		}, 5000)

		signal.addEventListener('abort', () => {
			clearInterval(intervalId)
		})
	},
})

type ProgressBarOptions = {
	progressState: ProgressState
	href: string
}
const ProgressBar = component<ProgressBarOptions>({
	name: 'route-progress-bar',
	styles,
	onMount({ append, element, options }) {
		const { progressState, href } = options

		const routeProgress = progressState[href]
		if (!routeProgress) return

		append(
			element('div', {
				role: 'status',
				aria: { live: 'polite', atomic: 'true' },
				classes: styles.srOnly,
				textContent: routeProgress.done
					? `Finished loading ${href}.`
					: `Loading ${href}\u2026`,
			}),
			element('div', {
				classes: [
					cssClass(styles.progressWrapper),
					cssClass(styles.active, !routeProgress.done),
				],
				on: routeProgress?.progress > 0
					? {
						transitionend() { delete progressState[href] },
						webkittransitionend() { delete progressState[href] },
					}
					: undefined,
				children: element('progress', {
					max: 100,
					value: routeProgress?.progress ?? 0,
					aria: {
						// TODO, better aria-type
						hidden: 'true',
					},
				}),
			}),
		)
	},
})
