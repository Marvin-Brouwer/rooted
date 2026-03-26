import { component, type ComponentContext, cssClass } from '@rooted/components'
import { gate, href, Link } from '@rooted/router'

import { type CategoryData, recipeData } from '../_shared/data/data.mts'

import { CategoryRoute } from './_routes.mts'
import styles from './categories.css'
import { Category } from './category.mts'

export const Categories = component({
	name: 'categories-page',
	styles,
	async onMount({ append, element, create }) {
		append(
			element('h1', { textContent: 'Categories' }),
			element('p', { classes: styles.subtitle, textContent: 'Browse recipes by category.' }),
			element('div', { classes: styles.categoryGrid, children: await mapCategories(element, create) }),

			gate(CategoryRoute, tokens => create(Category, { slug: tokens.slug })),
		)
	},
})

async function routeSelected(category: CategoryData): Promise<boolean> {
	const match = await CategoryRoute.match()
	if (!match.success) return false
	return match.tokens.slug === category.slug
}

async function mapCategories(element: ComponentContext['element'], create: ComponentContext['create']) {
	const categories = await recipeData.listCategories()

	return Promise.all(categories.map(async (category) => {
		const selected = await routeSelected(category)
		return create(Link, {
			classes: [
				cssClass(styles.categoryCard),
				cssClass(styles.selected, selected),
			],
			aria: {
				current: selected ? 'page' : undefined,
			},
			href: href.for(CategoryRoute, category),
			children: [
				element('div', {
					role: 'heading',
					aria: {
						level: '2',
					},
					classes: styles.categoryName,
					textContent: category.label,
				}),
				element('p', {
					classes: styles.categoryCount,
					textContent: `${category.recipes.length} recipe${category.recipes.length === 1 ? '' : 's'}`,
				}),
			],
		})
	}))
}
