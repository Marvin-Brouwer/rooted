import { component } from '@rooted/components'
import type { NavigateEvent } from '@rooted/router'

import styles from './route-progress.css'

export type ProgressState = {
	navigationType: NavigateEvent['navigationType'] | 'idle'
	spinnerRecommended: boolean
	progressCount: number
}

export const RouteProgress = component<{ progressState: ProgressState }>({
	name: 'route-progress',
	styles,
	onMount({ append, element, options, signal }) {
		const { progressState } = options

		const announcer = element('div', {
			role: 'status',
			aria: { live: 'polite', atomic: 'true' },
			classes: styles.srOnly,
		})
		const bar = element('progress', { max: 100 }) as HTMLProgressElement
		bar.setAttribute('aria-hidden', 'true')
		const spinner = element('div', { classes: styles.spinner })
		spinner.setAttribute('aria-hidden', 'true')
		const wrapper = element('div', {
			classes: styles.progressWrapper,
			children: [announcer, bar, spinner],
		})

		append(wrapper)

		let fakeProgress = 0
		let lastType: ProgressState['navigationType'] = 'idle'
		let lastProgressCount = 0

		const intervalId = setInterval(() => {
			const { navigationType, spinnerRecommended, progressCount } = progressState

			if (navigationType === lastType && progressCount === lastProgressCount) return
			if (navigationType === 'idle') return

			// Ensure bar is visible — handles fast navigation where 'start' was missed by the poll
			if (!wrapper.classList.contains(styles.active)) {
				fakeProgress = 0
				bar.value = 0
				wrapper.classList.add(styles.active)
				announcer.textContent = 'Loading\u2026'
			}

			if (navigationType === 'start' && lastType !== 'start') {
				lastType = navigationType
				lastProgressCount = 0
				fakeProgress = 0
				bar.value = 0
				spinner.classList.toggle(styles.visible, spinnerRecommended)
			} else if (navigationType === 'progress' && progressCount !== lastProgressCount) {
				lastType = navigationType
				lastProgressCount = progressCount
				spinner.classList.toggle(styles.visible, spinnerRecommended)
				if (progressCount === 1) {
					fakeProgress = Math.random() * 30
				} else {
					fakeProgress += Math.random() * (90 - fakeProgress)
				}
				bar.value = fakeProgress
			} else if (navigationType === 'end' && lastType !== 'end') {
				lastType = navigationType
				bar.value = 100
				announcer.textContent = 'Done'
				setTimeout(() => {
					wrapper.classList.remove(styles.active)
					spinner.classList.remove(styles.visible)
					setTimeout(() => { announcer.textContent = '' }, 1000)
				}, 150)
			}
		}, 50)

		signal.addEventListener('abort', () => clearInterval(intervalId))
	},
})
