import { component } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { Hero } from './hero.mts'
import styles from './not-found.css'

export const NotFoundPage = component({
	name: 'not-found-page',
	styles,
	onMount({ append, create }) {
		append(
			create(Hero),
			create('div', {
				classes: styles.notFound,
				children: [
					create('h1', { textContent: 'Page not found' }),
					create('p', {
						classes: styles.message,
						children: [
							'The page you\'re looking for', create('br'),
							'doesn\'t exist or has been moved.',
						],
					}),
					create(Link, {
						href: href.path(import.meta.env.BASE_URL),
						classes: styles.homeLink,
						children: '← Back to Home',
					}),
				],
			}),
		)
	},
})
