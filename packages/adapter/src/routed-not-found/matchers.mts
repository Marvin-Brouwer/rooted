import { resolveAdapterRoutes } from '../utility/adapter-routes.mts'
import { createRouteMatcher } from '../utility/route-matcher.mts'

import type { AdapterRoutes, DynamicRouteSupport } from '../adapter.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'

/**
 * The two predicates dev and preview both need, plus what the host answers for
 * a dynamic route.
 *
 * They have to be told apart: a static path has a real pre-rendered file the
 * host serves itself, a dynamic one only ever gets the shell.
 */
export type RouteMatchers = {
	/** The path has a pre-rendered `index.html` of its own. */
	isStatic(pathname: string): boolean
	/** The path is a route at all, static or `:param`. */
	isRoute(pathname: string): boolean
	/** What a matched dynamic route answers with: 200, or 404 on a host that only serves files. */
	dynamicStatus: 200 | 404
	/**
	 * Whether the canonical-slash redirect applies to this path.
	 *
	 * A host that only serves files redirects `/categories` to `/categories/`
	 * because there's a directory there, but has nothing to redirect
	 * `/recipe/42` to. Mirroring that keeps dev honest.
	 */
	shouldRedirect(pathname: string): boolean
}

export function createMatchers(
	routes: { staticPaths: string[], dynamicPatterns: string[] },
	dynamicRoutes: DynamicRouteSupport,
): RouteMatchers {
	const isStatic = createRouteMatcher({ staticPaths: routes.staticPaths, dynamicPatterns: [] })
	const isRoute = createRouteMatcher(routes)

	return {
		isStatic,
		isRoute,
		dynamicStatus: dynamicRoutes === 'routed' ? 200 : 404,
		shouldRedirect: dynamicRoutes === 'routed' ? isRoute : isStatic,
	}
}

/**
 * Keeps the matchers in step with the route manifest, which is empty until
 * buildStart and gets a fresh array whenever a route file is added or removed.
 */
export function createMatcherCache(
	getManifestApi: () => RouteManifestApi | undefined,
	manualRoutes: AdapterRoutes | undefined,
	dynamicRoutes: DynamicRouteSupport,
): () => RouteMatchers {
	// A sentinel, not undefined: with no manifest plugin `routes` is undefined
	// too, and the matchers would never be built.
	let cachedFor: unknown = Symbol('unresolved')
	let cached: RouteMatchers

	return () => {
		const manifestApi = getManifestApi()
		const routes = manifestApi?.routes
		if (routes !== cachedFor) {
			cachedFor = routes
			cached = createMatchers(resolveAdapterRoutes(manifestApi, manualRoutes), dynamicRoutes)
		}
		return cached
	}
}
