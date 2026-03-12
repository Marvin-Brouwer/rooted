import { Link, navigate } from '@rooted/router'
import styles from './navigation-menu.css?inline'

import { component } from '@rooted/components'

export const NavigationMenu = component({
	name: 'navigation-menu',
	styles,
	onMount({ append, create, signal }) {
		const nav = append(create('nav'))

		nav.append(
			create(Link, { href: '/', classes: 'nav-brand', children: 'Recipe Book' }),
			create(Link, { href: '/categories/', classes: 'nav-link', children: 'Browse' })
		)

		// TODO incorrect pattern
		const input = document.createElement('input')
		input.type = 'search'
		input.placeholder = 'Search recipes…'
		input.className = 'search-input'
		input.setAttribute('aria-label', 'Search recipes')

		// TODO incorrect pattern
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