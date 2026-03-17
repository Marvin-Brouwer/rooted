import styles from './navigation-menu.css'

import { Link } from '@rooted/router'

import { component } from '@rooted/components'
import { SearchBar } from '../search/search-bar.mts'

export const NavigationMenu = component({
	name: 'navigation-menu',
	styles,
	onMount({ append, create }) {
		const nav = append(create('nav'))

		nav.append(
			create(Link, { href: '/', classes: 'nav-brand', children: 'Recipe Book' }),
			create(Link, { href: '/categories/', classes: 'nav-link', children: 'Browse' }),
			create(SearchBar)
		)
	},
})