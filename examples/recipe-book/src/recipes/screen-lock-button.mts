import { component } from '@rooted/components'

import { announceToScreenReader } from '../_shared/a11y/announcer.mts'

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

		const activeIcon = element('svg:use', {
			href: `${activeSvg}#img`,
			style: {
				display: 'none',
			},
		})
		const inactiveIcon = element('svg:use', {
			href: `${inactiveSvg}#img`,
		})

		const button = append(
			element('button', {
				type: 'button',
				classes: styles.button,
				aria: {
					pressed: 'false',
				},
				on: {
					click: handleClick,
				},
				children: [
					element('svg', {
						width: '24',
						height: '24',
						viewBox: '0 0 24 24',
						aria: {
							hidden: 'true',
						},
						classes: styles.icon,
						children: [
							activeIcon,
							inactiveIcon,
						],
					}),
					element('span', {
						classes: styles.label,
						textContent: 'Sleep lock',
					}),
				],
			}),
		)

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
		signal.addEventListener('abort', () => {
			if (!locked) return void release()

			announceToScreenReader('Sleep lock disabled')
			void release()
		})

		// Re-acquire if the page regains visibility and the lock was lost
		on('document', 'visibilitychange', () => {
			if (document.visibilityState === 'visible' && locked && wakeLock === undefined) {
				void acquire()
			}
		})
	},
})
