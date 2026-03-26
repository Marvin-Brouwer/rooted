import { component } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { CategoriesRoute } from '../categories/_routes.mts'
import { SearchBar } from '../search/search-bar.mts'

import styles from './navigation-menu.css'

export const NavigationMenu = component({
	name: 'navigation-menu',
	styles,
	onMount({ append, element, create }) {
		append(element('a', { classes: styles.skipLink, href: '#main-content', textContent: 'Skip to main content' }))

		const nav = append(element('nav', { aria: { label: 'Main navigation menu' } }))

		nav.append(
			create(Link, { href: href.path('/'), classes: styles.navBrand, children: 'Recipe Book' }),
			create(Link, { href: href.for(CategoriesRoute), classes: styles.navLink, children: 'Browse' }),
			element('div', { classes: styles.searchWrapper, children: [create(SearchBar)] }),
		)
	},
})
