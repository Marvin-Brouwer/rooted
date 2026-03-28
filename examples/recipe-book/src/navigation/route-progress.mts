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

		let fakeProgress = 0
		let lastType: ProgressState['navigationType'] = 'idle'
		let lastProgressCount = 0
		let currentNav: {
			wrapper: HTMLElement
			bar: HTMLProgressElement
			spinner: HTMLElement
			announcer: HTMLElement
		} | undefined

		const intervalId = setInterval(() => {
			const { navigationType, spinnerRecommended, progressCount } = progressState

			if (navigationType === lastType && progressCount === lastProgressCount) return
			if (navigationType === 'idle') return

			if (navigationType === 'start' && lastType !== 'start') {
				lastType = navigationType
				lastProgressCount = 0
				fakeProgress = 0

				const announcer = element('div', {
					role: 'status',
					aria: { live: 'polite', atomic: 'true' },
					classes: styles.srOnly,
				})
				const bar = element('progress', { max: 100 }) as HTMLProgressElement
				bar.setAttribute('aria-hidden', 'true')
				bar.value = 0
				const spinner = element('div', { classes: styles.spinner })
				spinner.setAttribute('aria-hidden', 'true')
				const wrapper = element('div', {
					classes: styles.progressWrapper,
					children: [announcer, bar, spinner],
				})
				announcer.textContent = 'Loading\u2026'
				spinner.classList.toggle(styles.visible, spinnerRecommended)
				append(wrapper)
				// Force reflow so the opacity transition fires from 0 → 1
				wrapper.getBoundingClientRect()
				wrapper.classList.add(styles.active)

				currentNav = { wrapper, bar, spinner, announcer }

			} else if (navigationType === 'progress' && progressCount !== lastProgressCount) {
				lastType = navigationType
				lastProgressCount = progressCount
				if (!currentNav) return
				currentNav.spinner.classList.toggle(styles.visible, spinnerRecommended)
				if (progressCount === 1) {
					fakeProgress = Math.random() * 30
				} else {
					fakeProgress += Math.random() * (90 - fakeProgress)
				}
				currentNav.bar.value = fakeProgress

			} else if (navigationType === 'end' && lastType !== 'end') {
				lastType = navigationType
				if (!currentNav) return
				const { wrapper, bar, spinner, announcer } = currentNav
				currentNav = undefined
				bar.value = 100
				announcer.textContent = 'Done'
				setTimeout(() => {
					wrapper.classList.remove(styles.active)
					spinner.classList.remove(styles.visible)
					setTimeout(() => {
						wrapper.remove()
						announcer.textContent = ''
					}, 300) // wait for opacity fade-out transition (200ms)
				}, 150)
			}
		}, 50)

		signal.addEventListener('abort', () => {
			clearInterval(intervalId)
			currentNav?.wrapper.remove()
		})
	},
})
