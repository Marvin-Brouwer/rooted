import { component } from '@rooted/components'
import { ApplyUpdateButton, UpdateNotification } from '@rooted/pwa/components'

import styles from './update-banner.css'

/**
 * Sits under the demo banner and stays empty until the service worker has a new version waiting.
 * rooted doesn't swap a running page,
 * so this is how you get the new version without waiting for the next visit.
 */
export const UpdateBanner = component({
	name: 'update-banner',
	styles,
	onMount({ append, create, element }) {
		append(
			create(UpdateNotification, {
				children: element('div', {
					classes: styles.update,
					role: 'status',
					children: [
						element('span', {
							textContent: 'A new version of this app is available.',
						}),
						create(ApplyUpdateButton, {
							label: 'Reload',
							classes: styles.reload,
						}),
					],
				}),
			}),
		)
	},
})
