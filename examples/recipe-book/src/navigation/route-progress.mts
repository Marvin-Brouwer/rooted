import { component } from '@rooted/components'
import type { NavigateEvent } from '@rooted/router'

import styles from './route-progress.css'

export type ProgressState = {
	navigationType: NavigateEvent['navigationType'] | 'idle'
	spinnerRecommended: boolean
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

		const intervalId = setInterval(() => {
			const { navigationType, spinnerRecommended } = progressState
			if (navigationType === lastType) return
			lastType = navigationType

			if (navigationType === 'start') {
				fakeProgress = 0
				bar.value = 0
				wrapper.classList.add(styles.active)
				announcer.textContent = 'Loading\u2026'
				spinner.classList.toggle(styles.visible, spinnerRecommended)
			} else if (navigationType === 'progress') {
				fakeProgress += Math.random() * (90 - fakeProgress)
				bar.value = fakeProgress
			} else if (navigationType === 'end') {
				bar.value = 100
				announcer.textContent = 'Done'
				wrapper.classList.remove(styles.active)
				setTimeout(() => { announcer.textContent = '' }, 1000)
			}
		}, 50)

		signal.addEventListener('abort', () => clearInterval(intervalId))
	},
})
