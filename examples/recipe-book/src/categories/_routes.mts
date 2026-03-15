import { route, token, gate } from '@rooted/router'
import { Categories } from './categories.mts'
import { filterCategory } from './category.mts'

export const CategoriesRoute = route`/categories/`({
	resolve: ({ create }) => create(Categories),
})

export const CategoryRoute = route`${CategoriesRoute}${token('slug', String)}/`({
	resolve: async ({ create, tokens }) => {
		const found = await filterCategory(tokens.slug)
		if (!found) return undefined
		return create(Categories)
	},
})
