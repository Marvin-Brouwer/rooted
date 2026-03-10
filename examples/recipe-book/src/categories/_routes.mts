/** @module gates */

import { route, token, gate } from '@rooted/router'
import { Categories } from './categories.mjs'
import { Category } from './category.mjs'
import { Recipe } from '../recipes/recipe.mjs'

export const CategoriesRoute = route`/categories/`(Categories)
export const CategoryRoute = route`${CategoriesRoute}/${token('slug', String)}/`(Categories)
export const RecipeRoute = route`${CategoryRoute}/recipes/${token('id', Number)}/`(Categories)

export const CategoryGate = gate(CategoryRoute, Category)
export const RecipeGate = gate(RecipeRoute, Recipe)
