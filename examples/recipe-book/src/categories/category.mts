import styles from './category.css?inline'
import { component } from '@rooted/components'
import { type GateParameters, Link } from '@rooted/router'
import { type CategoryRoute } from './_routes.mts'
import { categories } from './_data.mts'

export type CategoryOptions = {
	gate: GateParameters<typeof CategoryRoute>
}

export const Category = component<CategoryOptions>({
	name: 'category-page',
	styles,
	onMount({ append, create, options }) {
		const { slug } = options.gate

		const category = categories.find(c => c.slug === slug)
		const categoryname = category ? category.label : String(slug)

		append('div', {
			className: 'category-header',
			children: [
				create('h1', { textContent: categoryname }),
				create('p', {
					textContent: category
						? `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`
						: `Category '${categoryname}' not found`,
				})
			]
		})

		if (category) {
			const list = append('ul', { className: 'recipe-list' })
			for (const recipe of category.recipes) {
				const href = `/recipe/${recipe.id}/`
				list.append(create('li', {
					className: 'recipe-item',
					children: [
						create(Link, { href, children: recipe.title }),
						create('span', {
							className: 'recipe-item-meta',
							textContent: `${recipe.prepTime + recipe.cookTime} min · ${recipe.difficulty}`,
						}),
					],
				}))
			}
		}

		append('hr', { className: 'divider' })
	},
})


export function filterCategory(slug: string) {
	return categories.some(c => c.slug === slug)
}