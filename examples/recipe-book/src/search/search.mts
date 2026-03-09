import { component } from '@rooted/components'
import { type GateParameters } from '@rooted/router'
import { type SearchGate } from './_gates.mts'
import { recipes } from '../recipes/_data.mts'
import { navLink } from '../navigate.mts'

export type SearchOptions = {
	gate: GateParameters<typeof SearchGate>
}

export const Search = component<SearchOptions>({
	name: 'search-page',
	styles: `
		h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
		.search-query {
			color: var(--color-primary);
			font-style: italic;
		}
		.result-count { color: var(--color-text-muted); margin: 0 0 1.5rem; }
		.result-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
		.result-item {
			background: var(--color-surface);
			border: 1px solid var(--color-border);
			border-radius: 8px;
			padding: 1rem 1.25rem;
		}
		.result-title { font-weight: 600; margin: 0 0 0.25rem; }
		.result-title a {
			color: var(--color-primary);
			text-decoration: none;
		}
		.result-title a:hover { text-decoration: underline; }
		.result-desc { color: var(--color-text-muted); font-size: 0.9rem; margin: 0; }
		.no-results { color: var(--color-text-muted); font-style: italic; }
	`,
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
						create('div', { className: 'result-title', children: navLink(href, recipe.title, signal) }),
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
