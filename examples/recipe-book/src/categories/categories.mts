import styles from './categories.css?inline'
import { component, type ComponentContext } from '@rooted/components'
import { categories } from './_data.mts'
import { NavLink } from '../navigate.mts'

export const Categories = component({
	name: 'categories-page',
	styles,
	onMount({ append, create }) {
		append('h1', { textContent: 'Categories' })
		append('p', { className: 'subtitle', textContent: 'Browse recipes by category.' })
		append('div', { className: 'category-grid', children: mapCategories(create) })
	},
})

function mapCategories(create: ComponentContext['create']) {
	return categories.map(category => create(NavLink, {
		className: 'category-card',
		href: `/categories/${category.slug}/`,
		children: [
			create('div', { className: 'category-name', textContent: category.label }),
			create('p', {
				className: 'category-count',
				textContent: `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`,
			}),
		],
	}))
}
