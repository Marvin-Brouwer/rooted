import { component } from '@rooted/components'
import { type GateParameters } from '@rooted/router'
import { type CategoryGate, RecipeGate } from './_gates.mts'
import { categories } from './_data.mts'
import { navLink, navigate } from '../navigate.mts'

export type CategoryOptions = {
	gate: GateParameters<typeof CategoryGate>
}

export const Category = component<CategoryOptions>({
	name: 'category-page',
	styles: `
		.category-header { margin-bottom: 1.5rem; }
		.category-header h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
		.category-header p { color: var(--color-text-muted); margin: 0; }
		.back-link {
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
			color: var(--color-primary);
			text-decoration: none;
			font-size: 0.9rem;
			margin-bottom: 1rem;
		}
		.back-link:hover { text-decoration: underline; }
		.recipe-list { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
		.recipe-item {
			background: var(--color-surface);
			border: 1px solid var(--color-border);
			border-radius: 8px;
			padding: 1rem 1.25rem;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.recipe-item a {
			text-decoration: none;
			color: var(--color-primary);
			font-weight: 500;
		}
		.recipe-item a:hover { text-decoration: underline; }
		.recipe-item-meta { font-size: 0.85rem; color: var(--color-text-muted); }
		.divider { border: none; border-top: 1px solid var(--color-border); margin: 1.5rem 0; }
	`,
	onMount({ append, options, signal }) {
		const { slug } = options.gate
		const category = categories.find(c => c.slug === slug)

		const back = append('a', { href: '/categories/', textContent: '← All categories', className: 'back-link' })
		back.addEventListener('click', e => { e.preventDefault(); navigate('/categories/') }, { signal })

		const header = append('div', { className: 'category-header' })
		header.append(
			Object.assign(document.createElement('h1'), {
				textContent: category ? category.label : slug,
			}),
			Object.assign(document.createElement('p'), {
				textContent: category
					? `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`
					: 'Category not found',
			}),
		)

		if (category) {
			const list = append('ul', { className: 'recipe-list' })
			for (const recipe of category.recipes) {
				const href = `/categories/${slug}/recipes/${recipe.id}/`
				const link = navLink(href, recipe.title, signal)
				const meta = Object.assign(document.createElement('span'), {
					className: 'recipe-item-meta',
					textContent: `${recipe.prepTime + recipe.cookTime} min · ${recipe.difficulty}`,
				})
				const li = document.createElement('li')
				li.className = 'recipe-item'
				li.append(link, meta)
				list.append(li)
			}
		}

		append('hr', { className: 'divider' })

		// RecipeGate is self-managing: it renders the recipe detail when
		// the URL matches /categories/:slug/recipes/:id/
		append(RecipeGate, {})
	},
})
