/** @module gates */

import { gate, wildcard } from '@rooted/router'
import { Search } from './search.mjs'

export const SearchGate = gate`/search/${wildcard('query')}/`(Search)
