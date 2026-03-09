import './style.css'
import navStyles from './nav.css?inline'
import notFoundStyles from './not-found.css?inline'

import { application } from '@rooted/components/application'
import { component } from '@rooted/components'
import { router } from '@rooted/router'

import * as appRoutes from './_routes.g.mts'
import { Home } from './home/home.mts'
import { NavLink, navigate } from './navigate.mts'

const Nav = component({
	name: 'recipe-nav',
	styles: navStyles,
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

const NotFound = component({
	name: 'not-found-page',
	styles: notFoundStyles,
	onMount({ append, create }) {
		const wrap = append('div', { className: 'not-found' })
		wrap.append(
			create('h1', { textContent: '404' }),
			create('p', { textContent: 'Page not found.' }),
			create(NavLink, { href: '/', children: '← Back to Home' }),
		)
	},
})

const Router = router({
	home: Home,
	notFound: NotFound,
	...appRoutes,
})

export const Application = component({
	name: 'recipe-application',
	onMount({ append, create }) {
		document.title = 'Recipe Book'
		append('div', {
			id: 'app',
			children: [
				create(Nav),
				create('main', {
					children: create(Router),
				}),
			],
		})
	},
})

application(Application)
