import { component } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { Hero } from './hero.mts'
import styles from './not-found.css'

export const NotFoundPage = component({
	name: 'not-found-page',
	styles,
	onMount({ append, element, create }) {
		append(
			create(Hero),
			element('div', {
				classes: styles.notFound,
				children: [
					element('h1', { textContent: 'Page not found' }),
					element('p', {
						classes: styles.message,
						children: [
							'The page you\'re looking for', element('br'),
							'doesn\'t exist or has been moved.',
						],
					}),
					create(Link, {
						href: href.path('/'),
						classes: styles.homeLink,
						children: '← Back to Home',
					}),
				],
			}),
		)
	},
})
