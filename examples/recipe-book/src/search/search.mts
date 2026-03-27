import { component } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { RecipeRoute } from '../recipes/_routes.mts'

import { SearchRoute } from './_routes.mts'
import styles from './search.css'

export const SearchPage = component({
	name: 'search-page',
	styles,
	async onMount({ append, element, create, on }) {
		// Wrap all rendered content so we can replace it on re-search without remounting
		const root = append(element('div', { aria: { live: 'polite', atomic: 'true' } }))
		const { recipeData } = await import('../_shared/data/data.mts')

		async function render() {
			root.replaceChildren()

			// Always read from the live URL so re-searches while on this page reflect the new query
			const urlQuery = await getSearchQueryFromUrl()
			const query = urlQuery.toLowerCase().trim()

			root.append(element('h1', {
				children: [
					document.createTextNode('Results for '),
					element('span', { classes: styles.searchQuery, textContent: `"${urlQuery}"` }),
				],
			}))

			const recipes = await recipeData.listRecipes()

			const matches = recipes.filter(r =>
				r.title.toLowerCase().includes(query)
				|| r.category.toLowerCase().includes(query)
				|| r.tags.some(t => t.toLowerCase().includes(query))
				|| r.description.toLowerCase().includes(query),
			)

			root.append(element('p', {
				classes: styles.resultCount,
				textContent: `${matches.length} recipe${matches.length === 1 ? '' : 's'} found`,
			}))

			if (matches.length === 0) {
				root.append(element('p', { classes: styles.noResults, textContent: 'No recipes match your search.' }))
				return
			}

			const list = element('ul', { classes: styles.resultList })
			for (const recipe of matches) {
				list.append(element('li', {
					classes: 'result-item',
					children: [
						element('div', {
							classes: styles.resultTitle,
							children: create(Link, { href: href.for(RecipeRoute, recipe), children: recipe.title }),
						}),
						element('p', { classes: styles.resultDesc, textContent: recipe.description }),
					],
				}))
			}
			root.append(list)
		}

		// Re-render when the user searches again while already on this page (same gate, new query)
		on('window', 'popstate', render)
		await render()
	},
})

export async function getSearchQueryFromUrl() {
	const match = await SearchRoute.match()
	return match.success ? decodeURIComponent(match.tokens.query) : ''
}
