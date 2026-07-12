import type { RouteManifestApi } from '@rooted/router/manifest'
import type { AnyRouteSeoResolver, RouteSeoMetadata } from '@rooted/router/routes'

type ManifestRoute = RouteManifestApi['routes'][number]

// Adapter, sitemap, and llms.txt each resolve the same route/path pairs
const cache = new WeakMap<ManifestRoute, Map<string, RouteSeoMetadata | undefined>>()

// Lazy seo resolvers run one at a time: they share the spoofed globals
let evaluationQueue: Promise<unknown> = Promise.resolve()

/**
 * Resolves a route's SEO metadata for one generated page.
 *
 * Plain seo objects pass through. Lazy seo resolvers are evaluated as if the
 * browser were at `staticPath`: the matched tokens are recovered from the
 * path, and `window`/`location` are spoofed around the call so URL-dependent
 * values (like localized text) come out right per page. Results are cached
 * per route and path.
 */
export async function resolveRouteSeo(route: ManifestRoute, staticPath: string): Promise<RouteSeoMetadata | undefined> {
	const seo = route.getMetadata().seo
	if (typeof seo !== 'function') return seo

	const routeCache = cache.get(route) ?? new Map<string, RouteSeoMetadata | undefined>()
	cache.set(route, routeCache)
	const cached = routeCache.get(staticPath)
	if (cached !== undefined || routeCache.has(staticPath)) return cached

	const match = await route.match({ target: staticPath })
	const tokens: Record<string, unknown> = match.success ? match.tokens : {}

	const resolved = await evaluateAtPath(seo, tokens, staticPath)
	routeCache.set(staticPath, resolved)
	return resolved
}

async function evaluateAtPath(seo: AnyRouteSeoResolver, tokens: Record<string, unknown>, staticPath: string): Promise<RouteSeoMetadata> {
	const run = evaluationQueue.then(async () => {
		const globals = globalThis as Record<string, unknown>
		const hadWindow = 'window' in globals
		const previousWindow = globals['window']
		const hadLocation = 'location' in globals
		const previousLocation = globals['location']

		try {
			// Minimal spoof: isClient() checks for window, href.current() reads location.href
			globals['window'] = previousWindow ?? {}
			globals['location'] = { href: `http://localhost${staticPath}` }
			return await seo({ tokens })
		}
		finally {
			if (hadWindow) globals['window'] = previousWindow
			else delete globals['window']
			if (hadLocation) globals['location'] = previousLocation
			else delete globals['location']
		}
	})

	evaluationQueue = run.catch(() => void 0)
	return run
}
