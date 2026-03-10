import styles from './home.css?inline'
import { component } from '@rooted/components'
import { recipes } from '../recipes/_data.mts'
import { Link } from '@rooted/router'

export const HomePage = component({
	name: 'home-page',
	styles,
	onMount({ append, create }) {
		append('h1', { textContent: 'Recipe Book' })
		append('p', { classes: 'subtitle', textContent: 'A collection of recipes, built with Rooted.' })
		append('h2', { textContent: 'Featured Recipes' })

		append('div', {
			classes: 'recipe-grid',
			children: recipes.filter(r => r.featured).map(recipe => {
				const href = `/recipe/${recipe.id}/`
				return create(Link, {
					href,
					classes: 'recipe-card',
					children: [
						create('div', { classes: 'card-title', textContent: recipe.title }),
						create('p', { classes: 'card-desc', textContent: recipe.description }),
						create('div', {
							classes: 'card-meta',
							children: [
								create('span', { classes: 'badge', textContent: recipe.category }),
								create('span', { textContent: `${recipe.prepTime + recipe.cookTime} min` }),
								create('span', { textContent: recipe.difficulty }),
							],
						}),
					],
				})
			}),
		})
	},
})
