import { route, wildcard } from '@rooted/router'
import { SearchPage } from './search.mts'

export const SearchRoute = route`/search/${wildcard('query')}/`({
	resolve: ({ create }) => create(SearchPage),
})
