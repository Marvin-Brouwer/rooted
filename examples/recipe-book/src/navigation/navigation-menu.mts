import styles from './navigation-menu.css?inline'

import { component } from '@rooted/components'
import { navigate, NavLink } from '../navigate.mts'

export const NavigationMenu = component({
	name: 'navigation-menu',
	styles,
	onMount({ append, create, signal }) {
		const nav = append('nav', {})

		nav.append(create(NavLink, { href: '/', className: 'nav-brand', children: 'Recipe Book' }))
		nav.append(create(NavLink, { href: '/categories/', className: 'nav-link', children: 'Browse' }))

		const input = document.createElement('input')
		input.type = 'search'
		input.placeholder = 'Search recipes…'
		input.className = 'search-input'
		input.setAttribute('aria-label', 'Search recipes')

		const btn = document.createElement('button')
		btn.type = 'submit'
		btn.className = 'search-btn'
		btn.textContent = 'Search'

		const form = create('form', { className: 'search-form', children: [input, btn] })
		form.addEventListener('submit', e => {
			e.preventDefault()
			const query = input.value.trim()
			if (query) navigate(`/search/${encodeURIComponent(query)}/`)
		}, { signal })

		// Keep the search bar in sync with the URL: show the active query on the search page,
		// clear it everywhere else
		const syncInput = () => {
			const match = window.location.pathname.match(/^\/search\/(.+)\/$/)
			input.value = match ? decodeURIComponent(match[1]) : ''
		}
		window.addEventListener('popstate', syncInput, { signal })
		syncInput()

		nav.append(form)
	},
})