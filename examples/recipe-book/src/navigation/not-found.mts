import styles from './not-found.css'

import { href, Link } from '@rooted/router'
import { component } from '@rooted/components'

export const NotFoundPage = component({
	name: 'not-found-page',
	styles,
	onMount({ append, create }) {
		const wrap = append(
			create('div', { classes: styles.notFound })
		)
		wrap.append(
			create('h1', { textContent: '404' }),
			create('p', { textContent: 'Page not found.' }),
			create(Link, { href: href.path('/'), children: '← Back to Home' }),
		)
	},
})