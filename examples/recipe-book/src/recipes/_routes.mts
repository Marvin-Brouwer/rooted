import { route, token } from '@rooted/router'
import { Recipe } from './recipe.mjs'

export const RecipeRoute = route`/recipe/${token('id', Number)}/`(Recipe)
