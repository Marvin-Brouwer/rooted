import styles from './navigation-menu.css'

import { href, Link } from '@rooted/router'

import { component } from '@rooted/components'
import { SearchBar } from '../search/search-bar.mts'
import { CategoriesRoute } from '../categories/_routes.mts'

export const NavigationMenu = component({
	name: 'navigation-menu',
	styles,
	onMount({ append, create }) {
		const nav = append(create('nav'))

		nav.append(
			create(Link, { href: href.path(import.meta.env.BASE_URL), classes: styles.navBrand, children: 'Recipe Book' }),
			create(Link, { href: href.for(CategoriesRoute), classes: styles.navLink, children: 'Browse' }),
			create('div', { classes: styles.searchWrapper, children: [create(SearchBar)] }),
		)
	},
})