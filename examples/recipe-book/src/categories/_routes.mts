import { route, token } from '@rooted/router'

export const CategoriesRoute = route`/categories/`({
	async resolve({ create }) {
		const { Categories } = await import('./categories.mts')
		return create(Categories)
	},
})

export const CategoryRoute = route`${CategoriesRoute}${token('slug', String)}/`({
	async resolve({ create, tokens }) {
		const { filterCategory } = await import('./category.mts')
		const { Categories } = await import('./categories.mts')

		const found = await filterCategory(tokens.slug)
		if (!found) return undefined

		return create(Categories)
	},
})
