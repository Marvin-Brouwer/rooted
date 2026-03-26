import { component } from '@rooted/components'
import { Link, href } from '@rooted/router'

import { recipeData } from '../_shared/data/data.mts'
import { RecipeRoute } from '../recipes/_routes.mts'

import styles from './category.css'

export type CategoryOptions = {
	slug: string
}

export const Category = component<CategoryOptions>({
	name: 'category-page',
	styles,
	async onMount({ append, element, create, options }) {
		const { slug } = options

		const category = await recipeData.findCategoryBySlug(slug)
		const categoryname = category ? category.label : String(slug)

		append(
			element('div', {
				classes: 'category-header',
				children: [
					element('h1', { textContent: categoryname }),
					element('p', {
						textContent: category
							? `${category.recipes.length} recipe${category.recipes.length === 1 ? '' : 's'}`
							: `Category '${categoryname}' not found`,
					}),
				],
			}),
		)

		if (category) {
			const list = element('ul', { classes: 'recipe-list' })
			for (const recipe of category.recipes) {
				list.append(element('li', {
					classes: styles.recipeItem,
					children: [
						create(Link, { href: href.for(RecipeRoute, recipe), children: recipe.title }),
						element('span', {
							classes: styles.recipeItemMeta,
							textContent: `${recipe.prepTime + recipe.cookTime} min · ${recipe.difficulty}`,
						}),
					],
				}))
			}
			append(list)
		}

		append(element('hr', { classes: 'divider' }))
	},
})

export async function filterCategory(slug: string) {
	const category = await recipeData.findCategoryBySlug(slug)
	return !!category
}
