import { route, token } from '@rooted/router'
import { Recipe } from './recipe.mts'

export const RecipeRoute = route`/recipe/${token('id', Number)}/`({
	resolve: ({ create, tokens }) => create(Recipe, { id: tokens.id }),
})
