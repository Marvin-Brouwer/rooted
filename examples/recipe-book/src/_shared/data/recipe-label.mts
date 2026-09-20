import { choice } from '@rooted/components'

import { type RecipeData } from './data.mts'

/** Formats a recipe count with the right singular or plural noun, like `1 recipe` or `3 recipes`. */
export function recipeCountLabel(recipes: ReadonlyArray<RecipeData>): string {
	const noun = choice(recipes.length === 1,
		'recipe',
		'recipes'
	)

	return `${recipes.length} ${noun}`
}
