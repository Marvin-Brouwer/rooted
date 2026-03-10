import styles from './recipe.css?inline'
import { component } from '@rooted/components'
import { type GateParameters, Link } from '@rooted/router'
import { type RecipeRoute } from '../categories/_gates.mts'
import { recipes } from './_data.mts'

export type RecipeOptions = {
	gate: GateParameters<typeof RecipeRoute>
}

export const Recipe = component<RecipeOptions>({
	name: 'recipe-detail',
	styles,
	onMount({ append, create, options }) {
		const recipe = recipes.find(r => r.id === options.gate.id)

		if (!recipe) {
			append('p', { className: 'not-found', textContent: 'Recipe not found.' })
			return
		}

		const backHref = `/categories/${recipe.category}/`
		append(Link, {
			href: backHref,
			className: 'back-link',
			children: `← Back to ${recipe.category}`,
		})

		const header = append('div', { className: 'recipe-header' })
		header.append(create('h2', { textContent: recipe.title }))

		const meta = create('ul', { className: 'recipe-meta' })
		const badges = [
			recipe.category,
			`${recipe.servings} serving${recipe.servings !== 1 ? 's' : ''}`,
			`Prep ${recipe.prepTime} min`,
			`Cook ${recipe.cookTime} min`,
			recipe.difficulty,
		]
		for (const text of badges) {
			meta.append(create('li', { className: 'meta-badge', textContent: text }))
		}
		header.append(meta)

		// Render the markdown-converted HTML body.
		// Safe: content originates from version-controlled markdown files.
		const body = append('div', { className: 'recipe-body' })
		body.innerHTML = recipe.html
	},
})
