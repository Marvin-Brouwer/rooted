import styles from './categories.css?inline'
import { component, type ComponentContext } from '@rooted/components'
import { categories, Category } from './_data.mts'
import { Link } from '@rooted/router'
import { CategoryGate, CategoryRoute } from './_routes.mts'

export const Categories = component({
	name: 'categories-page',
	styles,
	onMount({ append, create }) {
		append('h1', { textContent: 'Categories' })
		append('p', { classes: 'subtitle', textContent: 'Browse recipes by category.' })
		append('div', { classes: 'category-grid', children: mapCategories(create) })
		append(CategoryGate)
	},
})

// TODO make a utility to make this a more typed and cleaner check
function routeSelected(category: Category) {
	const routeParams = CategoryRoute.match(location)
	if (!routeParams) return false

	return routeParams.slug === category.slug
}

function mapCategories(create: ComponentContext['create']) {
	return categories.map(category => create(Link, {
		classes: { 'category-card': true, 'selected': routeSelected(category) },
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
