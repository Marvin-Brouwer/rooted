import { component, ComponentContext } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { type RecipeData as DataRecipe, recipeData } from '../_shared/data/data.mts'
import { CategoriesRoute, CategoryRoute } from '../categories/_routes.mts'

import { RecipeIngredientsRoute, RecipeInstructionsRoute } from './_routes.mts'
import { IngredientsList } from './ingredients-list.mts'
import { RecipeTabs } from './recipe-tabs.mts'
import styles from './recipe.css'

export type RecipeOptions = {
	id: number
}

export const Recipe = component<RecipeOptions>({
	name: 'recipe-detail',
	styles,
	async onMount({ append, element, create, options }) {
		const recipe = await recipeData.getRecipeById(options.id)

		if (!recipe) return void append(
			create(Link, { href: href.for(CategoriesRoute), classes: styles.backLink, children: '← Browse' }),
			element('div', {
				classes: styles.recipeHeader,
				children: element('h1', { textContent: 'No recipe' }),
			}),
			element('p', { classes: styles.notFound, textContent: 'Recipe not found.' }),
		)

		const instructionsPanel = element('div', {
			classes: styles.instructions,
			// Safe: content originates from version-controlled markdown files.
			innerHTML: recipe.instructionsHtml,
		})

		append(
			create(Link, {
				href: href.for(CategoryRoute, { slug: recipe.category }),
				classes: styles.backLink,
				children: `← Back to ${recipe.category}`,
			}),
			element('div', {
				classes: 'recipe-header',
				children: [
					element('h1', { textContent: recipe.title }),
					element('ul', {
						classes: styles.recipeMeta,
						children: meta(element, recipe),
					}),
				],
			}),

			create(RecipeTabs, {
				recipeId: options.id,
				tabs: [
					{
						id: 'instructions',
						label: 'Instructions',
						panel: instructionsPanel,
						route: RecipeInstructionsRoute,
					},
					{
						id: 'ingredients',
						label: 'Ingredients',
						panel: create(IngredientsList, { groups: recipe.ingredients }),
						route: RecipeIngredientsRoute,
					},
				],
			}),
		)
	},
})

function meta(element: ComponentContext['element'], recipe: DataRecipe) {
	return [
		element('li', { classes: 'meta-badge', textContent: recipe.category }),
		element('li', { classes: 'meta-badge', textContent: `${recipe.servings} serving${recipe.servings === 1 ? '' : 's'}` }),
		element('li', { classes: 'meta-badge', textContent: `Prep ${recipe.prepTime} min` }),
		element('li', { classes: 'meta-badge', textContent: `Cook ${recipe.cookTime} min` }),
		element('li', { classes: 'meta-badge', textContent: recipe.difficulty }),
	]
}
