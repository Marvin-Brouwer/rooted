import { route, token } from '@rooted/router/routes'

/**
 * ## Route for the category overview page
 *
 * Basic route, no specifics
 */
export const CategoriesRoute = route`/categories/`({
	async resolve({ create }) {
		const { Categories } = await import('./categories.mts')
		return create(Categories)
	},
})

/**
 * ## Route for category pages
 *
 * This illustrates how an additional filter can be used
 * to return a not-found result for dynamic routes.
 */
export const CategoryRoute = route`/${CategoriesRoute}/${token('slug', String)}/`({
	async resolve({ create, tokens }) {
		const { filterCategory } = await import('./category.mts')
		const { Categories } = await import('./categories.mts')

		const found = await filterCategory(tokens.slug)
		if (!found) return

		return create(Categories)
	},
})
