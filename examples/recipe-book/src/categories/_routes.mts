import { route, token, gate } from '@rooted/router'
import { Categories } from './categories.mjs'
import { Category } from './category.mjs'

export const CategoriesRoute = route`/categories/`(Categories)
export const CategoryRoute = route`${CategoriesRoute}/${token('slug', String)}/`(Categories)

export const CategoryGate = gate(CategoryRoute, Category)
