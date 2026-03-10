import styles from './home.css?inline'
import { component } from '@rooted/components'
import { recipes } from '../recipes/_data.mts'
import { Link } from '@rooted/router'

export const HomePage = component({
	name: 'home-page',
	styles,
	onMount({ append, create }) {
		append('h1', { textContent: 'Recipe Book' })
		append('p', { className: 'subtitle', textContent: 'A collection of recipes, built with Rooted.' })
		append('h2', { textContent: 'Featured Recipes' })

		append('div', {
			className: 'recipe-grid',
			children: recipes.filter(r => r.featured).map(recipe => {
				const href = `/recipe/${recipe.id}/`
				return create(Link, {
					href,
					className: 'recipe-card',
					children: [
						create('div', { className: 'card-title', textContent: recipe.title }),
						create('p', { className: 'card-desc', textContent: recipe.description }),
						create('div', {
							className: 'card-meta',
							children: [
								create('span', { className: 'badge', textContent: recipe.category }),
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
