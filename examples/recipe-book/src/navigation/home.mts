import styles from './home.css?inline'

import { component, ComponentContext } from '@rooted/components'
import { Link } from '@rooted/router'
import { type Recipe } from '../_shared/data/data.mts'

export const HomePage = component({
	name: 'home-page',
	styles,
	async onMount({ append, create }) {
		append(
			create('h1', { textContent: 'Recipe Book' }),
			create('p', { classes: 'subtitle', textContent: 'A collection of recipes, built with Rooted.' }),
			create('h2', { textContent: 'Featured Recipes' }),

			create('div', {
				classes: 'recipe-grid',
				children: await grid(create),
			})
		)
	},
})

async function grid(create: ComponentContext<typeof HomePage>['create']) {
	const { recipes } = await import('../_shared/data/data.mts')

	return recipes.filter(r => r.featured).map(recipe => {
		const href = `/recipe/${recipe.id}/`
		return create(Link, {
			href,
			classes: 'recipe-card',
			children: card(create, recipe),
		})
	})
}

function card(create: ComponentContext<typeof HomePage>['create'], recipe: Recipe): Node[] {
	return [
		create('div', { classes: 'card-title', textContent: recipe.title }),
		create('p', { classes: 'card-desc', textContent: recipe.description }),
		create('div', {
			classes: 'card-meta',
			children: [
				create('span', { classes: 'badge', textContent: recipe.category }),
				create('span', { textContent: `${recipe.prepTime + recipe.cookTime} min` }),
				create('span', { textContent: recipe.difficulty }),
			],
		})
	]
}