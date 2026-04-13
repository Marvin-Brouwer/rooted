import { component } from '@rooted/components'

import styles from './screen-lock-button.css'
import activeSvg from './screen-lock-button.icon-active.svg?no-inline'
import inactiveSvg from './screen-lock-button.icon-inactive.svg?no-inline'

/**
 * A toggle button that keeps the screen awake using the Wake Lock API.
 *
 * The lock is always released when the component unmounts (i.e. when
 * navigating away from the recipe).
 *
 * @example
 * ```ts
 * create(ScreenLockButton)
 * ```
 */
export const ScreenLockButton = component({
	name: 'screen-lock-button',
	styles,
	onMount({ append, element, on, signal }) {
		let wakeLock: WakeLockSentinel | undefined
		let locked = false

		const activeIcon = svgIcon(activeSvg)
		activeIcon.style.display = 'none'
		const inactiveIcon = svgIcon(inactiveSvg)

		const label = element('span', { classes: styles.label, textContent: 'Sleep lock' })

		const button = element('button', {
			type: 'button',
			classes: styles.button,
			aria: { pressed: 'false' },
			on: { click: handleClick },
			children: [activeIcon, inactiveIcon, label] as unknown as Node,
		})

		function updateButton() {
			activeIcon.style.display = locked ? '' : 'none'
			inactiveIcon.style.display = locked ? 'none' : ''
			button.ariaPressed = locked ? 'true' : 'false'
			button.ariaLabel = locked ? 'Sleep lock on: screen will stay on' : 'Sleep lock off: screen may turn off automatically'
		}

		async function acquire() {
			if (!('wakeLock' in navigator)) return
			try {
				wakeLock = await navigator.wakeLock.request('screen')
				wakeLock.addEventListener('release', () => {
					if (signal.aborted) return
					locked = false
					updateButton()
				}, { signal })
			}
			catch {
				// Wake Lock denied or unavailable — just track state visually
			}
		}

		async function release() {
			const lock = wakeLock
			wakeLock = undefined
			await lock?.release()
		}

		async function handleClick() {
			locked = !locked
			updateButton()
			await (locked ? acquire() : release())
		}

		// signal aborts when the component unmounts (SPA route change),
		// which is the correct teardown hook — window unload does not fire for route changes
		signal.addEventListener('abort', () => void release())

		// Re-acquire if the page regains visibility and the lock was lost
		on('document', 'visibilitychange', () => {
			if (document.visibilityState === 'visible' && locked && wakeLock === undefined) {
				void acquire()
			}
		})

		append(button)
	},
})

function svgUse(url: string) {
	const use = document.createElementNS('http://www.w3.org/2000/svg', 'use')
	use.setAttribute('href', url)
	return use
}

function svgIcon(url: string) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svg.setAttribute('width', '24')
	svg.setAttribute('height', '24')
	svg.setAttribute('viewBox', '0 0 24 24')
	svg.setAttribute('aria-hidden', 'true')
	svg.classList.add(styles.icon!.toString())
	svg.append(svgUse(url))
	return svg
}
