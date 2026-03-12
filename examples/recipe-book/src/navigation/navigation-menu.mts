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

		const input = create('input', {
			type: 'search',
			name: 'query',
			placeholder: 'Search recipes…',
			classes: 'search-input',
			ariaLabel: 'Search recipes'
		})

		const submit = create('button', {
			type: 'submit',
			classes: 'search-btn',
			textContent: 'Search'
		})

		const form = create('form', {
			classes: 'search-form',
			children: [input, submit]
		})
		form.addEventListener('submit', submitQuery, { signal })

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


function submitQuery(e: SubmitEvent) {
	e.preventDefault()
	const formData = new FormData(e.target as HTMLFormElement)
	const query = formData.get('query')?.toString()?.trim()
	if (query) navigate(`/search/${encodeURIComponent(query)}/`)
}