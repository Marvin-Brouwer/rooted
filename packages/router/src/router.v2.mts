import { Component, component, GenericComponent } from '@rooted/components'
import { isRoute, Route, route, RouteParameterDictionary } from './route.v2.mts'
import { create } from '@rooted/components/elements'
import * as href from './href.mts'
import { RouteMatch } from './route.match.v2.mts'

/**
 * Configuration object passed to {@link router}.
 *
 * @todo write doc
 */
type RouterConfig = {
	home: Component
	notFound: Component
} & {
	[key: string]: RouterCompatibleRoute<any>
}

/**
 * Constrains a route to be **router-compatible**: its component must not require
 * any external options beyond the automatically-injected `gate` parameter.
 *
 * @todo doc
 */
export type RouterCompatibleRoute<G> = G extends Route<any> ? G : never

/**
 * The validated version of a {@link RouterConfig}.
 *
 * `home` and `notFound` keys are passed through as-is. Every other key that is
 * a {@link RouteDefinition} must be a {@link RouterCompatibleRoute}; incompatible
 * routes produce `never` and therefore a compile-time error. Non-route values
 * (e.g. {@link BoundGateDefinition}) are passed through as-is.
 */
export type ValidatedRouterConfig<T extends RouterConfig> = {
	[K in keyof T]: K extends 'home' | 'notFound' ? T[K] : RouterCompatibleRoute<T[K]>
}

export function router<const T extends RouterConfig>(config: ValidatedRouterConfig<T>): GenericComponent {

	const { home: homeComponent, notFound: notFoundComponent, ...userRoutes } = config
	const routes = [
		route`/`({ resolve: () => homeComponent }),
		...Object.values(userRoutes).filter(isRoute)
	]

	// TODO dev.validateDuplicateRoutes?.(config)

	return create(Router, { routes, fallback: notFoundComponent })
}

type RouterProps = {
	routes: Array<RouterCompatibleRoute<any>>,
	fallback: Component
}
const Router = component<RouterProps>({
	name: 'rooted:router',
	async onMount({ append, create, signal, options }) {

        let activeEl: GenericComponent | undefined = undefined
		let lastPath: string | undefined

		const cache = new Map<string, undefined | FilterRoutesResult>()

		function renderRoute(component: Component | undefined, tokens: RouteParameterDictionary<Route<any>>) {
			activeEl = activeEl?.remove() ?? undefined
			if (component) {
				activeEl = append(create(component, { tokens }))
			} else {
				activeEl = append(create(options.fallback))
			}
		}

		async function update() {
			const target = href.current();

			if (target.pathOnly === lastPath) return
			lastPath = target.pathOnly

			if (cache.has(target.pathOnly)) {
				const { component, match } = cache.get(target.pathOnly)!
				return renderRoute(component, match.tokens)
			}

			const matchRouteResult = await matchRoute(target, options.routes)
			if (!matchRouteResult) {
				cache.set(target.pathOnly, undefined)
				return renderRoute(undefined, { })
			}

			cache.set(target.pathOnly, matchRouteResult)
			return renderRoute(
				matchRouteResult.component,
				matchRouteResult.match.tokens
			)
		}

		window.addEventListener('popstate', update, { signal })
		update()
	}
})

type SuccessRouteMatch = RouteMatch<any> & { success: true }
type FilterRoutesResult = { route: Route<any>, match: SuccessRouteMatch, component: Component }

type FilterRouteResult =
    | { kind: 'no-match' }
    | { kind: 'suppressed'; patternLength: number }
    | { kind: 'matched'; match: SuccessRouteMatch; component: Component }

async function filterRoute(route: Route<any>, target: href.Path): Promise<FilterRouteResult> {
    const patternMatch = await route.match({ target })
    if (!patternMatch.success) return { kind: 'no-match' }

    const component = await route.resolve(patternMatch.tokens)
    if (!component) return { kind: 'suppressed', patternLength: patternMatch.length }

    return { kind: 'matched', match: patternMatch, component }
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
            best = { route, match: result.match, component: result.component }
            continue
        }
        // Equal length: non-wildcard beats wildcard (more specific wins)
        if (result.match.length === best.match.length && !route.hasWildcard && best.route.hasWildcard) {
            best = { route, match: result.match, component: result.component }
        }
    }

    // Suppression: a longer structural match was filtered — treat as no match
    if (best && highestSuppressedLength > best.match.length) return undefined
    return best
}
