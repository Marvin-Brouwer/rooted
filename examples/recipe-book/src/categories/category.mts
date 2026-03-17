import styles from './category.css'

import { component } from '@rooted/components'
import { Link, href } from '@rooted/router'
import { RecipeRoute } from '../recipes/_routes.mts'
import { recipeData } from '../_shared/data/data.mts'

export type CategoryOptions = {
	slug: string
}

export const Category = component<CategoryOptions>({
	name: 'category-page',
	styles,
	async onMount({ append, create, options }) {
		const { slug } = options

		const category = await recipeData.findCategoryBySlug(slug)
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
				list.append(create('li', {
					classes: styles.recipeItem,
					children: [
						create(Link, { href: href.for(RecipeRoute, recipe), children: recipe.title }),
						create('span', {
							classes: styles.recipeItemMeta,
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
	const category = await recipeData.findCategoryBySlug(slug)
	return !!category
}
