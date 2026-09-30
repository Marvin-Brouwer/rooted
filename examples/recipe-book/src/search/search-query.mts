import { SearchRoute } from './_routes.mts'

/**
 * The search query in the current URL, or an empty string off the search page.
 * Lives outside the search page so the search bar can read it without loading that page.
 */
export async function getSearchQueryFromUrl() {
	const match = await SearchRoute.match()
	return match.success ? decodeURIComponent(match.tokens.query) : ''
}
