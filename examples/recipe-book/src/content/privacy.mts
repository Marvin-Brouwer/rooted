import { component } from '@rooted/components'

import styles from './privacy.css'

export const Privacy = component({
	name: 'privacy-page',
	styles,
	onMount({ append, element }) {
		append(
			element('div', {
				classes: styles.page,
				children: [
					element('h1', { textContent: 'Privacy' }),
					element('p', {
						classes: styles.lead,
						textContent: 'This application collects no personal data of any kind.',
					}),

					element('h2', { textContent: 'Cookies and storage' }),
					element('p', {
						textContent: 'No cookies are set. No localStorage or sessionStorage data is written. The only browser storage used is the URL itself for client-side routing state.',
					}),

					element('h2', { textContent: 'Analytics and tracking' }),
					element('p', {
						textContent: 'This site uses no analytics, telemetry, advertising networks, or third-party tracking scripts. There is nothing to opt out of.',
					}),

					element('h2', { textContent: 'Hosting' }),
					element('p', {
						children: [
							'This site is a fully static build hosted on ',
							element('a', {
								href: 'https://pages.github.com',
								target: '_blank',
								rel: 'noopener noreferrer',
								textContent: 'GitHub Pages',
							}),
							'. No server-side processing of requests occurs. GitHub\'s own privacy policy applies at the infrastructure level.',
						],
					}),

					element('h2', { textContent: 'External links' }),
					element('p', {
						textContent: 'This site links to GitHub and Unsplash. When you follow those links, their respective privacy policies apply.',
					}),
				],
			}),
		)
	},
})
