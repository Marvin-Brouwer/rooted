import { component } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { CategoriesRoute } from '../categories/_routes.mts'
import { SearchBar } from '../search/search-bar.mts'

import styles from './navigation-menu.css'

export const NavigationMenu = component({
	name: 'navigation-menu',
	styles,
	onMount({ append, create }) {
		const nav = append(create('nav'))

		nav.append(
			create(Link, { href: href.path('/'), classes: styles.navBrand, children: 'Recipe Book' }),
			create(Link, { href: href.for(CategoriesRoute), classes: styles.navLink, children: 'Browse' }),
			create('div', { classes: styles.searchWrapper, children: [create(SearchBar)] }),
		)
	},
})
