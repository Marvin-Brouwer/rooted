import styles from './search.css?inline'
import { component } from '@rooted/components'
import { type GateParameters } from '@rooted/router'
import { type SearchGate } from './_gates.mts'
import { recipes } from '../recipes/_data.mts'
import { NavLink } from '../navigate.mts'

export type SearchOptions = {
	gate: GateParameters<typeof SearchGate>
}

export const Search = component<SearchOptions>({
	name: 'search-page',
	styles,
	onMount({ append, create, signal }) {
		// Wrap all rendered content so we can replace it on re-search without remounting
		const root = append('div', {})

		function render() {
			root.replaceChildren()

			// Always read from the live URL so re-searches while on this page reflect the new query
			const rawQuery = window.location.pathname.replace(/^\/search\//, '').replace(/\/$/, '')
			const query = decodeURIComponent(rawQuery).toLowerCase().trim()
			const displayQuery = decodeURIComponent(rawQuery)

			root.append(create('h1', {
				children: [
					document.createTextNode('Results for '),
					create('span', { className: 'search-query', textContent: `"${displayQuery}"` }),
				],
			}))

			const matches = recipes.filter(r =>
				r.title.toLowerCase().includes(query) ||
				r.category.toLowerCase().includes(query) ||
				r.tags.some(t => t.toLowerCase().includes(query)) ||
				r.description.toLowerCase().includes(query),
			)

			root.append(create('p', {
				className: 'result-count',
				textContent: `${matches.length} recipe${matches.length !== 1 ? 's' : ''} found`,
			}))

			if (matches.length === 0) {
				root.append(create('p', { className: 'no-results', textContent: 'No recipes match your search.' }))
				return
			}

			const list = create('ul', { className: 'result-list' })
			for (const recipe of matches) {
				const href = `/categories/${recipe.category}/recipes/${recipe.id}/`
				list.append(create('li', {
					className: 'result-item',
					children: [
						create('div', { className: 'result-title', children: create(NavLink, { href, children: recipe.title }) }),
						create('p', { className: 'result-desc', textContent: recipe.description }),
					],
				}))
			}
			root.append(list)
		}

		render()
		// Re-render when the user searches again while already on this page (same gate, new query)
		window.addEventListener('popstate', render, { signal })
	},
})
