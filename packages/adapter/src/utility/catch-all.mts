import { withTrailingSlash } from './route-matcher.mts'

/**
 * The part of each dynamic pattern before its first `:param`, for hosts that can only put a wildcard at the end of a rule.
 *
 * Patterns that share one collapse into it, and a pattern that starts with a `:param` gives `/`,
 * which covers everything, so it's then the only one returned.
 *
 * @example
 * ```ts
 * catchAllPrefixes(['/recipe/:id/', '/recipe/:id/ingredients/', '/category/:slug/'])
 * // ['/recipe/', '/category/']
 * catchAllPrefixes(['/recipe/:id/', '/:slug/'])
 * // ['/']
 * ```
 */
export function catchAllPrefixes(dynamicPatterns: string[]): string[] {
	const prefixes = [...new Set(dynamicPatterns.flatMap(catchAllPrefix))]
	return prefixes.includes('/') ? ['/'] : prefixes
}

function catchAllPrefix(pattern: string): string[] {
	const segments = pattern.split('/')
	const firstParameter = segments.findIndex(segment => segment.startsWith(':'))
	if (firstParameter === -1) return []
	return [`${segments.slice(0, firstParameter).join('/')}/`]
}

/**
 * Tells app routes apart from everything else the way a host with only end-of-rule wildcards does:
 * a static path matches as written, and a dynamic pattern matches anything under the part before its first `:param`.
 *
 * That's looser than {@link createRouteMatcher}, on purpose. `/recipe/:id/` becomes `/recipe/*` on such a host,
 * so `/recipe/42/extra/` gets the page too, and dev should say so rather than pretend the host is stricter than it is.
 * The prefix itself (`/recipe/`) isn't matched, because there's nothing after it for the wildcard to catch.
 *
 * @example
 * ```ts
 * const matches = createCatchAllMatcher({ staticPaths: [], dynamicPatterns: ['/recipe/:id/'] })
 * matches('/recipe/42/')       // true
 * matches('/recipe/42/extra/') // true, the host can't tell these apart
 * matches('/recipe/')          // false
 * ```
 */
export function createCatchAllMatcher(
	routes: { staticPaths: string[], dynamicPatterns: string[] },
): (pathname: string) => boolean {
	const staticPaths = new Set(['/', ...routes.staticPaths.map(withTrailingSlash)])
	const prefixes = catchAllPrefixes(routes.dynamicPatterns)

	return (pathname: string) => {
		if (staticPaths.has(pathname)) return true
		return prefixes.some(prefix => pathname.startsWith(prefix) && pathname.length > prefix.length)
	}
}
