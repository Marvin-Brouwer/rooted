import { Link } from '@rooted/router'
import styles from './not-found.css?inline'

import { component } from '@rooted/components'

export const NotFoundPage = component({
	name: 'not-found-page',
	styles,
	onMount({ append, create }) {
		const wrap = append(
			create('div', { classes: 'not-found' })
		)
		wrap.append(
			create('h1', { textContent: '404' }),
			create('p', { textContent: 'Page not found.' }),
			create(Link, { href: '/', children: '← Back to Home' }),
		)
	},
})