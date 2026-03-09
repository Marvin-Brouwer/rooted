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
	onMount({ append, options, signal }) {
		// The wildcard captures everything after /search/, e.g. "/search/pasta/" → "pasta/"
		const rawQuery = options.gate.query.replace(/\/$/, '')
		const query = decodeURIComponent(rawQuery).toLowerCase().trim()

		append('h1', {
			children: [
				document.createTextNode('Results for '),
				Object.assign(document.createElement('span'), {
					className: 'search-query',
					textContent: `"${decodeURIComponent(rawQuery)}"`,
				}),
			],
		})

		const matches = recipes.filter(r =>
			r.title.toLowerCase().includes(query) ||
			r.category.toLowerCase().includes(query) ||
			r.tags.some(t => t.toLowerCase().includes(query)) ||
			r.description.toLowerCase().includes(query),
		)

		append('p', {
			className: 'result-count',
			textContent: `${matches.length} recipe${matches.length !== 1 ? 's' : ''} found`,
		})

		if (matches.length === 0) {
			append('p', { className: 'no-results', textContent: 'No recipes match your search.' })
			return
		}

		const list = append('ul', { className: 'result-list' })
		for (const recipe of matches) {
			const href = `/categories/${recipe.category}/recipes/${recipe.id}/`
			const link = navLink(href, recipe.title, signal)
			const title = Object.assign(document.createElement('div'), { className: 'result-title' })
			title.append(link)
			const desc = Object.assign(document.createElement('p'), {
				className: 'result-desc',
				textContent: recipe.description,
			})
			const li = document.createElement('li')
			li.className = 'result-item'
			li.append(title, desc)
			list.append(li)
		}
	},
})
