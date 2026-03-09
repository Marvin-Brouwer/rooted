/** @module gates */

import { gate, junction, token } from '@rooted/router'
import { Categories } from './categories.mjs'
import { Category } from './category.mjs'
import { Recipe } from '../recipes/recipe.mjs'

export const CategoriesGate = gate`/categories/`(Categories)
export const CategoryGate = junction`/categories/${token('slug', String)}/`(Category)
export const RecipeGate = gate`${CategoryGate}/recipes/${token('id', Number)}/`(Recipe)
