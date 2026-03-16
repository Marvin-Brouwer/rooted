import { Component, component, GenericComponent } from '@rooted/components'
import { Route, route } from './route.mts'
import { isRoute, routeMetaData } from './route.metadata.mts'
import { dev } from './dev-helper.mts'
import { create } from '@rooted/components/elements'
import * as href from './href.mts'
import { RouteMatch } from './route.match.mts'

/**
 * Configuration object passed to {@link router}.
 *
 * - `home` — component rendered at `/`.
 * - `notFound` — component rendered when no route matches the current URL.
 * - All other keys — {@link Route} values registered with the router. The key
 *   names are used only for duplicate-route detection in development; they have
 *   no effect at runtime.
 */
type RouterConfig = {
	home: Component
	notFound: Component
} & {
	[key: string]: RouterCompatibleRoute<any>
}

/**
 * Constrains a value to be a {@link Route}.
 *
 * Non-route values produce `never`, causing a compile-time error when used
 * in a {@link RouterConfig}. This ensures only valid routes are registered.
 */
export type RouterCompatibleRoute<G> = G extends Route<any> ? G : never

/**
 * The validated version of a {@link RouterConfig}.
 *
 * `home` and `notFound` keys are passed through as-is. All other keys must
 * satisfy {@link RouterCompatibleRoute}; incompatible values produce `never`
 * and therefore a compile-time error.
 */
export type ValidatedRouterConfig<T extends RouterConfig> = {
	[K in keyof T]: K extends 'home' | 'notFound' ? T[K] : RouterCompatibleRoute<T[K]>
}

/**
 * Creates a self-managing router component that renders the best-matching route
 * on every navigation.
 *
 * On each `popstate` event (and on initial mount), all registered routes are
 * evaluated concurrently against the current path. The router selects the route
 * whose pattern consumes the most characters. When two routes match the same
 * length, the more specific (non-wildcard) one wins.
 *
 * **Suppression:** if a route's `resolve` returns `undefined`, the router treats
 * the URL as intentionally unmatched by that pattern and does _not_ fall back to
 * any shorter-matching route. The `notFound` component is rendered instead.
 *
 * Route results are cached by pathname so `resolve` is only called once per
 * unique path visited.
 *
 * @example
 * ```ts
 * import { router } from '@rooted/router'
 *
 * export const App = router({
 *   home: Home,
 *   notFound: NotFound,
 *   articles: ArticleRoute,
 *   article: ArticleDetailRoute,
 * })
 * ```
 *
 * @see {@link route}
 * @see {@link RouterConfig}
 */
export function router<const T extends RouterConfig>(config: ValidatedRouterConfig<T>): GenericComponent {

	const { home: homeComponent, notFound: notFoundComponent, ...userRoutes } = config
	const routes = [
		route`/`({ resolve: ({ create }) => create(homeComponent) }),

		...Object.values(userRoutes)
			.filter(isRoute)
			.filter(r => !r[routeMetaData].hasErrors)
	]

	dev.validateDuplicateRoutes?.(config)

	return create(Router, { routes, fallback: notFoundComponent })
}

type RouterProps = {
	routes: Array<RouterCompatibleRoute<any>>,
	fallback: Component
}
const Router = component<RouterProps>({
	name: 'rooted:router',
	async onMount({ append, create, signal, options }) {

        let activeEl: Element | undefined = undefined
		let lastPath: string | undefined

		const cache = new Map<string, undefined | { route: Route<any>, match: SuccessRouteMatch }>()

		function renderRoute(element: Element | undefined) {
			activeEl?.remove()
			activeEl = append(element ?? create(options.fallback))
		}

		async function update() {
			const target = href.current();

			if (target.pathOnly === lastPath) return
			lastPath = target.pathOnly

			if (cache.has(target.pathOnly)) {
				const cached = cache.get(target.pathOnly)
				if (!cached) return renderRoute(undefined)
				const element = await cached.route.resolve({ create, tokens: cached.match.tokens })
				return renderRoute(element)
			}

			const matchRouteResult = await matchRoute(target, options.routes)
			if (!matchRouteResult) {
				cache.set(target.pathOnly, undefined)
				return renderRoute(undefined)
			}

			cache.set(target.pathOnly, { route: matchRouteResult.route, match: matchRouteResult.match })
			return renderRoute(matchRouteResult.element)
		}

		window.addEventListener('popstate', update, { signal })
		update()
	}
})

type SuccessRouteMatch = RouteMatch<any> & { success: true }
type FilterRoutesResult = { route: Route<any>, match: SuccessRouteMatch, element: Element }

type FilterRouteResult =
    | { kind: 'no-match' }
    | { kind: 'suppressed'; patternLength: number }
    | { kind: 'matched'; match: SuccessRouteMatch; element: Element }

async function filterRoute(route: Route<any>, target: href.Path): Promise<FilterRouteResult> {
    const patternMatch = await route.match({ target })
    if (!patternMatch.success) return { kind: 'no-match' }

    const element = await route.resolve({ create, tokens: patternMatch.tokens })
    if (!element) return { kind: 'suppressed', patternLength: patternMatch.length }

    return { kind: 'matched', match: patternMatch, element }
}

async function matchRoute(target: href.Path, routes: Route<any>[]) {

	// Find the best filtered route in parallel
    const results = await Promise.all(routes.map(async route => ({
        route,
        result: await filterRoute(route, target)
    })))

    let best: FilterRoutesResult | undefined
    let highestSuppressedLength = -1

    for (const { route, result } of results) {
        if (result.kind === 'suppressed') {
            highestSuppressedLength = Math.max(highestSuppressedLength, result.patternLength)
            continue
        }
        if (result.kind !== 'matched') continue

        if (!best || result.match.length > best.match.length) {
            best = { route, match: result.match, element: result.element }
            continue
        }
        // Equal length: non-wildcard beats wildcard (more specific wins)
        if (result.match.length === best.match.length && !route[routeMetaData].hasWildcard && best.route[routeMetaData].hasWildcard) {
            best = { route, match: result.match, element: result.element }
        }
    }

    // Suppression: a longer structural match was filtered — treat as no match
    if (best && highestSuppressedLength > best.match.length) return undefined
    return best
}
