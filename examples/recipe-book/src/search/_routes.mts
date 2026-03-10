import { route, wildcard } from '@rooted/router'
import { SearchPage } from './search.mjs'

export const SearchRoute = route`/search/${wildcard('query')}/`(SearchPage)
