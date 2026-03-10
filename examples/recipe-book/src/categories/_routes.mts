import { route, token, gate } from '@rooted/router'
import { Categories } from './categories.mjs'
import { Category } from './category.mjs'
import { categories } from './_data.mts'

export const CategoriesRoute = route`/categories/`(Categories)
export const CategoryRoute = route`${CategoriesRoute}/${token('slug', String)}/`(
	Categories,
	({ slug }) => categories.some(c => c.slug === slug),
)

export const CategoryGate = gate(CategoryRoute, Category)
