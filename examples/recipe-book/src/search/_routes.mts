import { route, wildcard } from '@rooted/router'

export const SearchRoute = route`/search/${wildcard('query')}/`({
	async resolve({ create }) {
		const { SearchPage } = await import('./search.mts')
		return create(SearchPage)
	},
})
