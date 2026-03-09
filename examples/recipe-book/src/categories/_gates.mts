/** @module gates */

import { gate, token } from '@rooted/router'
import { Categories } from './categories.mjs'
import { Category } from './category.mjs'

export const CategoriesGate = gate`/categories/`(Categories)
export const CategoryGate = gate`/categories/${token('slug', String)}/`(Category)
