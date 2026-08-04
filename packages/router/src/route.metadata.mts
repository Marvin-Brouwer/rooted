import type { AnyRoute, Route, RouteParameters, UnknownRoute } from './route.mts'
import type { Parameter, RouteParameter } from './route.tokens.mts'

/** Symbol key for the {@link RouteMetadata} bag attached to every {@link Route}. */
export const routeMetadata: unique symbol = Symbol.for('@rooted/route-metadata')

/**
 * Optional SEO metadata attached to a route via the `seo` field in {@link route}.
 *
 * Used at build time to inject per-page meta tags into static route copies of
 * `index.html`, and at runtime to update `document.title` and Open Graph tags
 * on navigation.
 *
 * @example
 * ```ts
 * export const SearchRoute = route`/search/`({
 *   resolve: ({ create }) => create(SearchPage),
 *   seo: {
 *     title: 'Search recipes',
 *     description: 'Find recipes by keyword, category, or ingredient.',
 *   },
 * })
 * ```
 */
export type RouteSeoMetadata = {
	/** Page title. Overrides `<title>` and `og:title`. */
	title?: string
	/** Page description. Overrides `<meta name="description">` and `og:description`. */
	description?: string
	/** When `true`, injects `<meta name="robots" content="noindex">`. Default: `false`. */
	noIndex?: boolean
	/** When `true`, omits this route from sitemap generation. Default: `false`. */
	excludeFromSitemap?: boolean
	/**
	 * Override for `og:image`. Accepts an absolute URL or a root-relative path.
	 * Falls back to the generated PWA icon (`pwa-512x512.png`) when omitted.
	 */
	image?: string
	/** Sitemap `changefreq` field. */
	changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
	/** Sitemap `priority` field (0.0–1.0). */
	priority?: number
}

/**
 * The untyped shape of a lazy seo resolver as stored on {@link RouteMetadata}.
 * See `RouteSeoResolver` in route.mts for the typed builder-facing variant.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRouteSeoResolver = (context: { tokens: any }) => RouteSeoMetadata | Promise<RouteSeoMetadata>

/**
 * Internal metadata bag stored on every {@link Route} under the {@link routeMetadata} symbol key.
 *
 * Do not access directly from application code. Use {@link isRoute} to test
 * whether a value is a route, and access `route[routeMetaData]` only within
 * router internals.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteMetadata<T extends { parameters: any, parent?: any }> = {
	/** The typed path token descriptors declared with {@link token}. */
	readonly tokenTypes: T['parameters']
	/** The parent route, if this route is nested. */
	readonly parentType: T extends { parent: infer P } ? P : never
	/** `true` if this route's pattern includes any parameters. */
	readonly hasParameterTokens: boolean
	/** `true` if this route's pattern ends with a wildcard parameter. */
	readonly hasWildcard: boolean
	/** Present and `true` when the route pattern has validation errors. */
	readonly hasErrors?: true
	/** The split-up parts of the route pattern. */
	readonly routeParts: Array<string | RouteParameter>
	/** Resolved static path string if this route has no dynamic segments, `false` otherwise. */
	readonly staticRoute: false | string
	/**
	 * All concrete paths this route can produce at build time.
	 *
	 * `[staticRoute]` for fully static routes. Routes whose only dynamic parts
	 * are constant-values tokens (including through parent routes) unroll to
	 * the cartesian product of the listed values, e.g.
	 * `route\`/${token('locale', ['en-GB', 'nl-NL'])}/about/\`` produces
	 * `['/en-GB/about/', '/nl-NL/about/']`. `false` when the route has a typed
	 * token, a wildcard, or a dynamic parent. Build tooling (sitemap,
	 * prerendering) uses this to enumerate pages.
	 */
	readonly staticPaths: false | readonly string[]
	/** Optional SEO metadata for this route, or a lazy resolver for it. */
	readonly seo?: RouteSeoMetadata | AnyRouteSeoResolver
}

/** Returns `true` if `instance` is a {@link Route}. */
export function isRoute<T extends RouteParameters<Parameter[]>>(instance: Route<T>): instance is Route<T>
export function isRoute<T>(instance: T): instance is Extract<T, AnyRoute>
export function isRoute<T>(instance: T): instance is Extract<T, UnknownRoute>
export function isRoute<T extends AnyRoute>(instance: T): instance is T
export function isRoute<T extends UnknownRoute>(instance: T): instance is T
export function isRoute(instance: unknown): instance is UnknownRoute {
	return typeof instance === 'object' && instance !== null && routeMetadata in instance
}
