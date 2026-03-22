import { component } from '@rooted/components'

import styles from './privacy.css'

export const Privacy = component({
	name: 'privacy-page',
	styles,
	onMount({ append, create }) {
		append(create('div', {
			classes: styles.page,
			children: [
				create('h1', { textContent: 'Privacy' }),
				create('p', {
					classes: styles.lead,
					textContent: 'This application collects no personal data of any kind.',
				}),

				create('h2', { textContent: 'Cookies and storage' }),
				create('p', {
					textContent: 'No cookies are set. No localStorage or sessionStorage data is written. The only browser storage used is the URL itself for client-side routing state.',
				}),

				create('h2', { textContent: 'Analytics and tracking' }),
				create('p', {
					textContent: 'This site uses no analytics, telemetry, advertising networks, or third-party tracking scripts. There is nothing to opt out of.',
				}),

				create('h2', { textContent: 'Hosting' }),
				create('p', {
					children: [
						'This site is a fully static build hosted on ',
						create('a', {
							href: 'https://pages.github.com',
							target: '_blank',
							rel: 'noopener noreferrer',
							textContent: 'GitHub Pages',
						}),
						'. No server-side processing of requests occurs. GitHub\'s own privacy policy applies at the infrastructure level.',
					],
				}),

				create('h2', { textContent: 'External links' }),
				create('p', {
					textContent: 'This site links to GitHub and Unsplash. When you follow those links, their respective privacy policies apply.',
				}),
			],
		}))
	},
})
