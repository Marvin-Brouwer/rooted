import { route, token, gate } from '@rooted/router'
import { Categories } from './categories.mjs'
import { Category, filterCategory } from './category.mjs'

export const CategoriesRoute = route`/categories/`(Categories)
export const CategoryRoute = route`${CategoriesRoute}/${token('slug', String)}/`(Categories,
	({ slug }) => filterCategory(slug)
)

export const CategoryGate = gate(CategoryRoute, Category)
