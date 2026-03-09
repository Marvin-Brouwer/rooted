import styles from './not-found.css?inline'

import { component } from '@rooted/components'
import { NavLink } from '../navigate.mts'

export const NotFoundPage = component({
	name: 'not-found-page',
	styles,
	onMount({ append, create }) {
		const wrap = append('div', { className: 'not-found' })
		wrap.append(
			create('h1', { textContent: '404' }),
			create('p', { textContent: 'Page not found.' }),
			create(NavLink, { href: '/', children: '← Back to Home' }),
		)
	},
})