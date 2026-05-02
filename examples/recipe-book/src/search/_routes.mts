import { route, wildcard } from '@rooted/router/routes'

/**
 * ## Route for the search page
 *
 * The search functionality uses a named wildcard to allow reading the rest of the url.
 */
export const SearchRoute = route`/search/${wildcard('query')}/`({
	async resolve({ create }) {
		const { SearchPage } = await import('./search.mts')
		return create(SearchPage)
	},
	seo: {
		title: 'Search recipes',
		description: 'Find recipes by keyword, category, or ingredient.',
		excludeFromSitemap: true,
	},
})
