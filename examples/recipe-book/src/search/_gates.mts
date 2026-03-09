/** @module gates */

import { gate, wildcard } from '@rooted/router'
import { SearchPage } from './search.mjs'

export const SearchGate = gate`/search/${wildcard('query')}/`(SearchPage)
