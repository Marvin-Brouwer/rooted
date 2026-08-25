import type { RouteManifestApi } from '@rooted/router/manifest'
import type { AnyRouteSeoResolver, RouteSeoMetadata } from '@rooted/router/routes'

/**
 * A route as the manifest plugin hands it out.
 *
 * @example
 * ```ts
 * for (const route of manifestApi.routes) {
 *   const seo = await resolveRouteSeo(route, '/en-GB/about/')
 * }
 * ```
 */
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
	const tokens: Record<string, unknown> = (match.success ? match.tokens : undefined) ?? {}

	const resolved = await evaluateAtPath(seo, tokens, staticPath)
	routeCache.set(staticPath, resolved)
	return resolved
}

async function evaluateAtPath(seo: AnyRouteSeoResolver, tokens: Record<string, unknown>, staticPath: string): Promise<RouteSeoMetadata> {
	const run = evaluationQueue.then(async () => {
		const globals = globalThis as Record<string, unknown>
		// Descriptors, not values. The static renderer installs `location` as a
		// getter-only accessor, so assigning over it throws in strict-mode ESM and
		// restoring a plain value afterwards would strip the accessor it needs.
		const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
		const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

		try {
			// Minimal spoof: isClient() checks for window, href.current() reads location.href
			spoof('window', globals['window'] ?? {})
			spoof('location', { href: `http://localhost${staticPath}` })
			return await seo({ tokens })
		}
		finally {
			restore('window', previousWindow)
			restore('location', previousLocation)
		}
	})

	evaluationQueue = run.catch(() => void 0)
	return run
}

function spoof(key: string, value: unknown): void {
	Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
}

function restore(key: string, descriptor: PropertyDescriptor | undefined): void {
	if (descriptor) Object.defineProperty(globalThis, key, descriptor)
	else Reflect.deleteProperty(globalThis, key)
}
