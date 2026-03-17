import styles from './recipe.css'

import { component, ComponentContext } from '@rooted/components'
import { href, Link } from '@rooted/router'
import { type RecipeData as DataRecipe } from '../_shared/data/data.mts'
import { CategoriesRoute, CategoryRoute } from '../categories/_routes.mts'

export type RecipeOptions = {
	id: number
}

export const Recipe = component<RecipeOptions>({
	name: 'recipe-detail',
	styles,
	async onMount({ append, create, options }) {
		const { recipes } = await import('../_shared/data/data.mts')
		const recipe = recipes.find(r => r.id === options.id)

		if (!recipe) return void append(
			create(Link, { href: href.for(CategoriesRoute), classes: styles.backLink, children: '← Browse' }),
			create('div', {
				classes: styles.recipeHeader,
				children: create('h2', { textContent: 'No recipe' })
			}),
			create('p', { classes: styles.notFound, textContent: 'Recipe not found.' })
		)

		append(
			create(Link, {
				href: href.for(CategoryRoute, { slug: recipe.category }),
				classes: styles.backLink,
				children: `← Back to ${recipe.category}`,
			}),
			create('div', {
				classes: 'recipe-header',
				children: [
					create('h2', { textContent: recipe.title }),
					create('ul', {
						classes: styles.recipeMeta,
						children: meta(create, recipe)
					})
				]
			}),

			create('div', {
				classes: styles.recipeBody,
				// Render the markdown-converted HTML body.
				// Safe: content originates from version-controlled markdown files.
				innerHTML: recipe.html
			})
		)
	},
})


function meta(create: ComponentContext<typeof Recipe>['create'], recipe: DataRecipe) {
	return [
		create('li', { classes: 'meta-badge', textContent: recipe.category }),
		create('li', { classes: 'meta-badge', textContent: `${recipe.servings} serving${recipe.servings !== 1 ? 's' : ''}` }),
		create('li', { classes: 'meta-badge', textContent: `Prep ${recipe.prepTime} min` }),
		create('li', { classes: 'meta-badge', textContent: `Cook ${recipe.cookTime} min` }),
		create('li', { classes: 'meta-badge', textContent: recipe.difficulty }),
	]
}
