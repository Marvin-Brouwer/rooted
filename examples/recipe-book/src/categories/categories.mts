import styles from './categories.css?inline'
import { component, type ComponentContext, cssClass } from '@rooted/components'
import { Link } from '@rooted/router'
import { CategoryGate, CategoryRoute } from './_routes.mts'
import { type Category } from '../_shared/data/data.mts'

export const Categories = component({
	name: 'categories-page',
	styles,
	async onMount({ append, create }) {
		append(
			create('h1', { textContent: 'Categories' }),
			create('p', { classes: 'subtitle', textContent: 'Browse recipes by category.' }),
			create('div', { classes: 'category-grid', children: await mapCategories(create) }),
			create(CategoryGate)
		)
	},
})

// TODO make a utility to make this a more typed and cleaner check
// Should be easier with new routing setup CategoryRoute.match(location).success
function routeSelected(category: Category) {
	const routeParams = CategoryRoute.match(location)
	if (!routeParams) return false

	return routeParams.slug === category.slug
}

async function mapCategories(create: ComponentContext['create']) {
	const { categories } = await import('../_shared/data/data.mts')
	return categories.map(category => create(Link, {
		classes: [
			cssClass('category-card'),
			cssClass('selected', routeSelected(category))
		],
		href: `/categories/${category.slug}/`,
		children: [
			create('div', { classes: 'category-name', textContent: category.label }),
			create('p', {
				classes: 'category-count',
				textContent: `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`,
			}),
		],
	}))
}
