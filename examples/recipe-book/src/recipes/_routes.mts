import { route, token } from '@rooted/router/routes'

/**
 * ## Route for recipe pages
 *
 * Having an id in the URL instead of a slug isn't very user-friendly. \
 * However, this is just to illustrate that `Number`'s are supported.
 *
 * What makes the recipe page special, compared to the {@link CategoryRoute}, \
 * is that we don't return a not-found result when the recipe doesn't exist. \
 * Instead the {@link ./recipe.mts} file handles this with a gate, so a specific recipe
 * not found page can be displayed.
 */
export const RecipeRoute = route`/recipe/${token('id', Number)}/`({
	async resolve({ create, tokens }) {
		const { Recipe } = await import('./recipe.mts')
		return create(Recipe, { id: tokens.id })
	},
})

export const RecipeInstructionsRoute = route`/${RecipeRoute}/instructions/`({
	resolve: RecipeRoute.resolve,
})
export const RecipeIngredientsRoute = route`/${RecipeRoute}/ingredients/`({
	resolve: RecipeRoute.resolve,
})
