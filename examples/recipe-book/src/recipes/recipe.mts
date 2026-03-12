import styles from './recipe.css?inline'
import { component } from '@rooted/components'
import { type GateParameters, Link } from '@rooted/router'
import { recipes } from './_data.mts'
import { type RecipeRoute } from './_routes.mts'

export type RecipeOptions = {
	gate: GateParameters<typeof RecipeRoute>
}

export const Recipe = component<RecipeOptions>({
	name: 'recipe-detail',
	styles,
	onMount({ append, create, options }) {
		const recipe = recipes.find(r => r.id === options.gate.id)

		if (!recipe) return void append(
			create(Link, { href: '/categories/', classes: 'back-link', children: '← Browse' }),
			create('div', {
				classes: 'recipe-header',
				children: create('h2', { textContent: 'No recipe' })
			}),
			create('p', { classes: 'not-found', textContent: 'Recipe not found.' })
		)

		// TODO incorrect pattern, see above
		const backHref = `/categories/${recipe.category}/`
		append(create(Link, {
			href: backHref,
			classes: 'back-link',
			children: `← Back to ${recipe.category}`,
		}))

		const header = append(create('div', { classes: 'recipe-header' }))
		header.append(create('h2', { textContent: recipe.title }))

		const meta = create('ul', { classes: 'recipe-meta' })
		const badges = [
			recipe.category,
			`${recipe.servings} serving${recipe.servings !== 1 ? 's' : ''}`,
			`Prep ${recipe.prepTime} min`,
			`Cook ${recipe.cookTime} min`,
			recipe.difficulty,
		]
		for (const text of badges) {
			meta.append(create('li', { classes: 'meta-badge', textContent: text }))
		}
		header.append(meta)

		// Render the markdown-converted HTML body.
		// Safe: content originates from version-controlled markdown files.
		append(create('div', { classes: 'recipe-body', innerHTML: recipe.html }))
	},
})
