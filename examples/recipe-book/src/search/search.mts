import styles from './search.css'

import { component } from '@rooted/components'
import { href, Link } from '@rooted/router'
import { RecipeRoute } from '../recipes/_routes.mts'

export const SearchPage = component({
	name: 'search-page',
	styles,
	async onMount({ append, create, signal }) {
		// Wrap all rendered content so we can replace it on re-search without remounting
		const root = append(create('div'))
		const { recipes } = await import('../_shared/data/data.mts')

		function render() {
			root.replaceChildren()

			// Always read from the live URL so re-searches while on this page reflect the new query
			const rawQuery = window.location.pathname.replace(/^\/search\//, '').replace(/\/$/, '')
			const query = decodeURIComponent(rawQuery).toLowerCase().trim()
			const displayQuery = decodeURIComponent(rawQuery)

			root.append(create('h1', {
				children: [
					document.createTextNode('Results for '),
					create('span', { classes: styles.searchQuery, textContent: `"${displayQuery}"` }),
				],
			}))

			const matches = recipes.filter(r =>
				r.title.toLowerCase().includes(query) ||
				r.category.toLowerCase().includes(query) ||
				r.tags.some(t => t.toLowerCase().includes(query)) ||
				r.description.toLowerCase().includes(query),
			)

			root.append(create('p', {
				classes: styles.resultCount,
				textContent: `${matches.length} recipe${matches.length !== 1 ? 's' : ''} found`,
			}))

			if (matches.length === 0) {
				root.append(create('p', { classes: styles.noResults, textContent: 'No recipes match your search.' }))
				return
			}

			const list = create('ul', { classes: styles.resultList })
			for (const recipe of matches) {
				list.append(create('li', {
					classes: 'result-item',
					children: [
						create('div', {
							classes: styles.resultTitle,
							children: create(Link, { href: href.for(RecipeRoute, recipe), children: recipe.title })
						}),
						create('p', { classes: styles.resultDesc, textContent: recipe.description }),
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
