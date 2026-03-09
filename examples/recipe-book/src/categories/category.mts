import styles from './category.css?inline'
import { component } from '@rooted/components'
import { type GateParameters } from '@rooted/router'
import { type CategoryGate, RecipeGate } from './_gates.mts'
import { categories } from './_data.mts'
import { NavLink } from '../navigate.mts'

export type CategoryOptions = {
	gate: GateParameters<typeof CategoryGate>
}

export const Category = component<CategoryOptions>({
	name: 'category-page',
	styles,
	onMount({ append, create, options }) {
		const { slug } = options.gate
		const category = categories.find(c => c.slug === slug)

		append(NavLink, { href: '/categories/', className: 'back-link', children: '← All categories' })

		append('div', {
			className: 'category-header',
			children: [
				create('h1', { textContent: category ? category.label : String(slug) }),
				create('p', {
					textContent: category
						? `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`
						: 'Category not found',
				})
			]
		})

		if (category) {
			const list = append('ul', { className: 'recipe-list' })
			for (const recipe of category.recipes) {
				const href = `/categories/${slug}/recipes/${recipe.id}/`
				list.append(create('li', {
					className: 'recipe-item',
					children: [
						create(NavLink, { href, children: recipe.title }),
						create('span', {
							className: 'recipe-item-meta',
							textContent: `${recipe.prepTime + recipe.cookTime} min · ${recipe.difficulty}`,
						}),
					],
				}))
			}
		}

		append('hr', { className: 'divider' })

		// RecipeGate is self-managing: it renders the recipe detail when
		// the URL matches /categories/:slug/recipes/:id/
		append(RecipeGate, {})
	},
})
