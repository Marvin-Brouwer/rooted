import { component, ComponentContext } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { type RecipeData, recipeData } from '../_shared/data/data.mts'
import { RecipeRoute } from '../recipes/_routes.mts'

import { Hero } from './hero.mts'
import styles from './home.css'

export const HomePage = component({
	name: 'home-page',
	styles,
	async onMount({ append, element, create }) {
		append(
			create(Hero),
			element('div', {
				classes: styles.recipeGrid,
				children: await grid(element, create),
			}),
		)
	},
})

async function grid(element: ComponentContext['element'], create: ComponentContext['create']) {
	const recipes = await recipeData.listFeatured()

	return recipes.map((recipe) => {
		return create(Link, {
			href: href.for(RecipeRoute, recipe),
			classes: styles.recipeCard,
			children: card(element, recipe),
		})
	})
}

function card(element: ComponentContext['element'], recipe: RecipeData): Node[] {
	return [
		element('h2', { classes: styles.cardTitle, textContent: recipe.title }),
		element('p', { classes: styles.cardDescription, textContent: recipe.description }),
		element('div', {
			classes: styles.cardMeta,
			children: [
				element('span', { classes: styles.badge, textContent: recipe.category }),
				element('span', { textContent: `${recipe.prepTime + recipe.cookTime} min` }),
				element('span', { textContent: recipe.difficulty }),
			],
		}),
	]
}
