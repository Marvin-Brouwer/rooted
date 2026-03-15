import styles from './categories.css?inline'
import { component, type ComponentContext, cssClass } from '@rooted/components'
import { gate, Link } from '@rooted/router'
import { CategoryRoute } from './_routes.mts'
import { type Category as DataCategory } from '../_shared/data/data.mts'
import { Category } from './category.mts'

export const Categories = component({
	name: 'categories-page',
	styles,
	async onMount({ append, create }) {
		append(
			create('h1', { textContent: 'Categories' }),
			create('p', { classes: 'subtitle', textContent: 'Browse recipes by category.' }),
			create('div', { classes: 'category-grid', children: await mapCategories(create) }),

			gate(CategoryRoute, (tokens) => create(Category, { slug: tokens.slug }))
		)
	},
})

async function routeSelected(category: DataCategory): Promise<boolean> {
	const match = await CategoryRoute.match({ target: location.href })
	if (!match.success) return false
	return match.tokens.slug === category.slug
}

async function mapCategories(create: ComponentContext['create']) {
	const { categories } = await import('../_shared/data/data.mts')
	return Promise.all(categories.map(async category => create(Link, {
		classes: [
			cssClass('category-card'),
			cssClass('selected', await routeSelected(category))
		],
		href: `/categories/${category.slug}/`,
		children: [
			create('div', { classes: 'category-name', textContent: category.label }),
			create('p', {
				classes: 'category-count',
				textContent: `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`,
			}),
		],
	})))
}
