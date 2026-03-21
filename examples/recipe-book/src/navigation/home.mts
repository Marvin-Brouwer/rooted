import { component, ComponentContext } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { type RecipeData, recipeData } from '../_shared/data/data.mts'
import { RecipeRoute } from '../recipes/_routes.mts'

import { Hero } from './hero.mts'
import styles from './home.css'

export const HomePage = component({
	name: 'home-page',
	styles,
	async onMount({ append, create }) {
		append(
			create(Hero),
			create('div', {
				classes: styles.recipeGrid,
				children: await grid(create),
			}),
		)
	},
})

async function grid(create: ComponentContext<typeof HomePage>['create']) {
	const recipes = await recipeData.listRecipes()

	return recipes.filter(r => r.featured).map((recipe) => {
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
		}),
	]
}
