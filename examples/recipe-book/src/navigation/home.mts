import styles from './home.css'

import { component, ComponentContext } from '@rooted/components'
import { href, Link } from '@rooted/router'
import { type RecipeData } from '../_shared/data/data.mts'
import { RecipeRoute } from '../recipes/_routes.mts'

export const HomePage = component({
	name: 'home-page',
	styles,
	async onMount({ append, create }) {
		append(
			create('h1', { textContent: 'Recipe Book' }),
			create('p', { classes: styles.subtitle, textContent: 'A collection of recipes, built with Rooted.' }),
			create('h2', { textContent: 'Featured Recipes' }),

			create('div', {
				classes: styles.recipeGrid,
				children: await grid(create),
			})
		)
	},
})

async function grid(create: ComponentContext<typeof HomePage>['create']) {
	const { recipes } = await import('../_shared/data/data.mts')

	return recipes.filter(r => r.featured).map(recipe => {
		return create(Link, {
			href: href.for(RecipeRoute, recipe),
			classes: styles.recipeCard,
			children: card(create, recipe),
		})
	})
}

function card(create: ComponentContext<typeof HomePage>['create'], recipe: RecipeData): Node[] {
	return [
		create('div', { classes: styles.cardTitle, textContent: recipe.title }),
		create('p', { classes: styles.cardDescription, textContent: recipe.description }),
		create('div', {
			classes: styles.cardMeta,
			children: [
				create('span', { classes: styles.badge, textContent: recipe.category }),
				create('span', { textContent: `${recipe.prepTime + recipe.cookTime} min` }),
				create('span', { textContent: recipe.difficulty }),
			],
		})
	]
}