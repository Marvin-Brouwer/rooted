import { component } from '@rooted/components'
import { categories } from './_data.mts'
import { navLink } from '../navigate.mts'

export const Categories = component({
	name: 'categories-page',
	styles: `
		h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
		.subtitle { color: var(--color-text-muted); margin: 0 0 2rem; }
		.category-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
			gap: 1rem;
		}
		.category-card {
			background: var(--color-surface);
			border: 1px solid var(--color-border);
			border-radius: 10px;
			padding: 1.5rem 1.25rem;
			text-decoration: none;
			color: inherit;
			display: block;
			transition: box-shadow 0.15s, transform 0.15s;
		}
		.category-card:hover {
			box-shadow: 0 4px 16px rgba(0,0,0,0.1);
			transform: translateY(-2px);
		}
		.category-name { font-size: 1.2rem; font-weight: 600; margin: 0 0 0.3rem; }
		.category-count { color: var(--color-text-muted); font-size: 0.9rem; margin: 0; }
	`,
	onMount({ append, signal }) {
		append('h1', { textContent: 'Categories' })
		append('p', { className: 'subtitle', textContent: 'Browse recipes by category.' })

		const grid = append('div', { className: 'category-grid' })

		for (const category of categories) {
			const href = `/categories/${category.slug}/`
			const card = navLink(href, '', signal)
			card.className = 'category-card'
			card.append(
				Object.assign(document.createElement('div'), { className: 'category-name', textContent: category.label }),
				Object.assign(document.createElement('p'), {
					className: 'category-count',
					textContent: `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`,
				}),
			)
			grid.append(card)
		}
	},
})
