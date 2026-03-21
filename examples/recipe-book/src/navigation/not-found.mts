import styles from './not-found.css'

import { href, Link } from '@rooted/router'
import { component } from '@rooted/components'
import { Hero } from './hero.mts'

export const NotFoundPage = component({
	name: 'not-found-page',
	styles,
	onMount({ append, create }) {
		append(
			create(Hero),
			create('div', {
				classes: styles.notFound,
				children: [
					create('h1', { textContent: '404' }),
					create('p', { textContent: 'Page not found.' }),
					create(Link, { href: href.path('/'), children: '← Back to Home' }),
				]
			})
		)
	},
})