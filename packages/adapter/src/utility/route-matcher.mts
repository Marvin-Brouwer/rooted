/** Adds the trailing slash that every route path is written with. */
export function withTrailingSlash(value: string): string {
	return value.endsWith('/') ? value : `${value}/`
}

/** A path whose last segment carries an extension is a file, not a route. */
export function looksLikeFile(pathname: string): boolean {
	return (pathname.split('/').pop() ?? '').includes('.')
}

/**
 * Tells app routes apart from everything else, with the same semantics as the
 * router in the generated `server.mjs`: a `:param` matches exactly one non-empty
 * segment, and the rest of the path is compared as written.
 *
 * Keep it that way. The point of this matcher is that `vite dev` and the built
 * server agree on what counts as a route, so a broken link fails in both.
 *
 * @example
 * ```ts
 * const matches = createRouteMatcher(resolveAdapterRoutes(manifestApi, options.routes))
 * matches('/recipe/42/')       // true
 * matches('/recipe/42/extra/') // false, :id is one segment
 * ```
 */
export function createRouteMatcher(
	routes: { staticPaths: string[], dynamicPatterns: string[] },
): (pathname: string) => boolean {
	const staticPaths = new Set(['/', ...routes.staticPaths.map(withTrailingSlash)])
	const dynamicPatterns = routes.dynamicPatterns.map(pattern => withTrailingSlash(pattern).split('/'))

	return (pathname: string) => {
		if (staticPaths.has(pathname)) return true
		const parts = pathname.split('/')
		return dynamicPatterns.some(pattern =>
			pattern.length === parts.length
			&& pattern.every((segment, index) => segment.startsWith(':') ? parts[index] !== '' : segment === parts[index]),
		)
	}
}
