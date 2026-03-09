import './style.css'

import { application } from '@rooted/components/application'
import { component } from '@rooted/components'
import { router } from '@rooted/router'

import * as appRoutes from './_routes.g.mts'
import { Home } from './home/home.mts'
import { navigate } from './navigate.mts'

const Nav = component({
	name: 'recipe-nav',
	styles: `
		nav {
			display: flex;
			align-items: center;
			gap: 1.5rem;
			padding: 0.875rem 2rem;
			background: var(--color-surface);
			border-bottom: 1px solid var(--color-border);
			margin-bottom: 2rem;
		}
		.nav-brand {
			font-weight: 700;
			font-size: 1.15rem;
			color: var(--color-primary);
			text-decoration: none;
			margin-right: auto;
		}
		.nav-brand:hover { opacity: 0.8; }
		.nav-link {
			color: var(--color-text);
			text-decoration: none;
			font-size: 0.95rem;
		}
		.nav-link:hover { color: var(--color-primary); }
		.search-form { display: flex; gap: 0.4rem; }
		.search-input {
			border: 1px solid var(--color-border);
			border-radius: 6px;
			padding: 0.35rem 0.7rem;
			font-size: 0.9rem;
			font-family: inherit;
			background: var(--color-bg);
			color: var(--color-text);
			width: 180px;
		}
		.search-input:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
		.search-btn {
			border: 1px solid var(--color-primary);
			border-radius: 6px;
			padding: 0.35rem 0.75rem;
			font-size: 0.9rem;
			font-family: inherit;
			background: var(--color-primary);
			color: #fff;
			cursor: pointer;
		}
		.search-btn:hover { opacity: 0.85; }
	`,
	onMount({ append, signal }) {
		const nav = append('nav', {})

		const brand = document.createElement('a')
		brand.href = '/'
		brand.className = 'nav-brand'
		brand.textContent = 'Recipe Book'
		brand.addEventListener('click', e => { e.preventDefault(); navigate('/') }, { signal })
		nav.append(brand)

		const categoriesLink = document.createElement('a')
		categoriesLink.href = '/categories/'
		categoriesLink.className = 'nav-link'
		categoriesLink.textContent = 'Browse'
		categoriesLink.addEventListener('click', e => { e.preventDefault(); navigate('/categories/') }, { signal })
		nav.append(categoriesLink)

		const form = document.createElement('form')
		form.className = 'search-form'

		const input = document.createElement('input')
		input.type = 'search'
		input.placeholder = 'Search recipes…'
		input.className = 'search-input'
		input.setAttribute('aria-label', 'Search recipes')

		const btn = document.createElement('button')
		btn.type = 'submit'
		btn.className = 'search-btn'
		btn.textContent = 'Search'

		form.append(input, btn)
		form.addEventListener('submit', e => {
			e.preventDefault()
			const query = input.value.trim()
			if (query) navigate(`/search/${encodeURIComponent(query)}/`)
		}, { signal })

		nav.append(form)
	},
})

const NotFound = component({
	name: 'not-found-page',
	styles: `
		.not-found { text-align: center; padding: 4rem 2rem; }
		h1 { font-size: 3rem; color: var(--color-primary); margin: 0 0 0.5rem; }
		p { color: var(--color-text-muted); margin: 0 0 1.5rem; }
		a { color: var(--color-primary); }
	`,
	onMount({ append, signal }) {
		const wrap = append('div', { className: 'not-found' })
		wrap.append(
			Object.assign(document.createElement('h1'), { textContent: '404' }),
			Object.assign(document.createElement('p'), { textContent: 'Page not found.' }),
		)
		const homeLink = document.createElement('a')
		homeLink.href = '/'
		homeLink.textContent = '← Back to Home'
		homeLink.addEventListener('click', e => { e.preventDefault(); navigate('/') }, { signal })
		wrap.append(homeLink)
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
