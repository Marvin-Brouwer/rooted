import { component } from '@rooted/components'

import styles from './announcer.css'

let liveRegion: HTMLElement | undefined

/**
 * Updates the app-level ARIA live region so screen readers announce the message.
 * Requires {@link Announcer} to be mounted in the layout.
 *
 * @example
 * ```ts
 * announceToScreenReader('Sleep lock disabled')
 * ```
 */
export function announceToScreenReader(message: string) {
	if (!liveRegion) return

	// Clear first so re-announcing the same message still triggers a read
	liveRegion.textContent = ''
	setTimeout(() => {
		if (liveRegion) liveRegion.textContent = message
	}, 50)
}

/**
 * Mounts a persistent visually-hidden ARIA live region used by
 * {@link announceToScreenReader}. Add this once at the application level.
 */
export const Announcer = component({
	name: 'screen-reader:announcer',
	styles,
	onMount({ append, element, signal }) {
		liveRegion = element('div', {
			classes: styles.announcer,
			aria: { live: 'polite', atomic: 'true' },
		})

		signal.addEventListener('abort', () => {
			liveRegion = undefined
		})

		append(liveRegion)
	},
})
