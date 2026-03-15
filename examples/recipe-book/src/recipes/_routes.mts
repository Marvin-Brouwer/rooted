import { route, token } from '@rooted/router'

export const RecipeRoute = route`/recipe/${token('id', Number)}/`({
	async resolve({ create, tokens }) {
		const { Recipe } = await import('./recipe.mts')
		return  create(Recipe, { id: tokens.id })
	}
})
