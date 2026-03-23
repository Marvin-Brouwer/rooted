import { component, type ComponentContext, cssClass } from '@rooted/components'
import { gate, href, Link } from '@rooted/router'

import { type CategoryData, recipeData } from '../_shared/data/data.mts'

import { CategoryRoute } from './_routes.mts'
import styles from './categories.css'
import { Category } from './category.mts'

export const Categories = component({
	name: 'categories-page',
	styles,
	async onMount({ append, create }) {
		append(
			create('h1', { textContent: 'Categories' }),
			create('p', { classes: styles.subtitle, textContent: 'Browse recipes by category.' }),
			create('div', { classes: styles.categoryGrid, children: await mapCategories(create) }),

			gate(CategoryRoute, tokens => create(Category, { slug: tokens.slug })),
		)
	},
})

async function routeSelected(category: CategoryData): Promise<boolean> {
	const match = await CategoryRoute.match()
	if (!match.success) return false
	return match.tokens.slug === category.slug
}

async function mapCategories(create: ComponentContext['create']) {
	const categories = await recipeData.listCategories()

	return Promise.all(categories.map(async (category) => {
		const selected = await routeSelected(category)
		return create(Link, {
			classes: [
				cssClass(styles.categoryCard),
				cssClass(styles.selected, selected),
			],
			ariaCurrent: selected ? 'page' : undefined,
			href: href.for(CategoryRoute, category),
			children: [
				create('div', { role: 'heading', ariaLevel: '2', classes: styles.categoryName, textContent: category.label }),
				create('p', {
					classes: styles.categoryCount,
					textContent: `${category.recipes.length} recipe${category.recipes.length === 1 ? '' : 's'}`,
				}),
			],
		})
	}))
}
