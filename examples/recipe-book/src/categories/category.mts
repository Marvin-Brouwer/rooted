import styles from './category.css?inline'
import { component } from '@rooted/components'
import { type GateParameters, Link } from '@rooted/router'
import { type CategoryRoute } from './_routes.mts'

export type CategoryOptions = {
	gate: GateParameters<typeof CategoryRoute>
}

export const Category = component<CategoryOptions>({
	name: 'category-page',
	styles,
	async onMount({ append, create, options }) {
		const { categories } = await import('../_shared/data/data.mts')
		const { slug } = options.gate

		const category = categories.find(c => c.slug === slug)
		const categoryname = category ? category.label : String(slug)

		append(
			create('div', {
				classes: 'category-header',
				children: [
					create('h1', { textContent: categoryname }),
					create('p', {
						textContent: category
							? `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`
							: `Category '${categoryname}' not found`,
					})
				]
			})
		)

		if (category) {
			const list = create('ul', { classes: 'recipe-list' })
			for (const recipe of category.recipes) {
				const href = `/recipe/${recipe.id}/`
				list.append(create('li', {
					classes: 'recipe-item',
					children: [
						create(Link, { href, children: recipe.title }),
						create('span', {
							classes: 'recipe-item-meta',
							textContent: `${recipe.prepTime + recipe.cookTime} min · ${recipe.difficulty}`,
						}),
					],
				}))
			}
			append(list)
		}

		append(create('hr', { classes: 'divider' }))
	},
})


export async function filterCategory(slug: string) {
	const { categories } = await import('../_shared/data/data.mts')
	return categories.some(c => c.slug === slug)
}