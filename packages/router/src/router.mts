import { component } from '@rooted/components'
import type { Component, GenericComponent } from '@rooted/components'
import { routeBrand, type RouteDefinition, type BoundGateDefinition, type OmitGate } from './gate-factory.mjs'
import { dev } from './dev-helper.mts'

/**
 * Configuration object passed to {@link router}.
 *
 * - `home` — Component rendered at `/`.
 * - `notFound` — Component rendered when the path is not `/` and no route matches.
 * - All other keys must be {@link RouteDefinition} or {@link BoundGateDefinition} values.
 *   Only `RouteDefinition` values are auto-mounted; `BoundGateDefinition` values are
 *   silently ignored (they are meant for explicit composition via `append()`).
 */
type RouterConfig = {
	home: Component
	notFound: Component
	[key: string]: Component | RouteDefinition<any, any> | BoundGateDefinition<any, any>
}

/**
 * Constrains a route to be **router-compatible**: its component must not require
 * any external options beyond the automatically-injected `gate` parameter.
 *
 * A route is compatible when:
 * - Its component has no options at all (`Component<never>`), **or**
 * - Every key in the options type beyond `gate` is optional (`{} extends OmitGate<O>`).
 *
 * Routes that require mandatory external options will produce a `never` type,
 * causing a compile-time error when passed to {@link router}.
 */
export type RouterCompatibleRoute<G> = G extends RouteDefinition<infer O, infer T>
	? ([O] extends [never] ? RouteDefinition<O, T> : ({} extends OmitGate<O> ? RouteDefinition<O, T> : never))
	: never

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

/**
 * Type guard that identifies a {@link RouteDefinition} by the presence of the
 * internal `routeBrand` symbol.
 *
 * @param value - Any value.
 * @returns `true` if `value` is a {@link RouteDefinition}.
 */
export function isRoute(value: unknown): value is RouteDefinition<any, any> {
	return typeof value === 'object' && value !== null && routeBrand in (value as object)
}

/**
 * Creates the application router component.
 *
 * The router mounts all provided routes, then independently manages the `home`
 * and `notFound` components based on the current URL:
 *
 * - **`home`** — mounted at `/`, unmounted everywhere else.
 * - **`notFound`** — mounted when the path is not `/` and no registered route matches.
 * - **Routes** — evaluated on every navigation; only the best match (the route
 *   whose pattern covers the most characters of the current URL) has its component
 *   rendered. If a child route matches, its parent route does not render.
 *
 * {@link BoundGateDefinition} values in the config are silently ignored — gates
 * are for explicit composition via `append()` inside route components, not for
 * top-level mounting.
 *
 * Duplicate routes (same object reference under multiple keys) are silently
 * deduplicated — the first key wins. In development a console warning is emitted.
 *
 * @param config - Router configuration with `home`, `notFound`, and route entries.
 * @returns A {@link Component} that can be mounted like any other component.
 *
 * @example Basic usage
 * ```ts
 * import { router } from '@rooted/router'
 *
 * const Router = router({
 *   home:     HomeComponent,
 *   notFound: NotFoundComponent,
 *   ArticleRoute,
 *   CommentsRoute,
 * })
 * ```
 *
 * @example With auto-discovered routes (Vite plugin)
 * ```ts
 * import { router } from '@rooted/router'
 * import { appRoutes } from './_routes.g.mts'
 *
 * const Router = router({ home, notFound, ...appRoutes })
 * ```
 *
 * @see {@link route}
 * @see {@link generateRouteManifest}
 */
export function router<const T extends RouterConfig>(config: ValidatedRouterConfig<T>): Component {
	const { home, notFound } = config
	const entries = Object.entries(config).filter(([k]) => k !== 'home' && k !== 'notFound')

	// Collect only RouteDefinitions — BoundGateDefinitions are ignored
	const seen = new Set<object>()
	const routes: Array<{ key: string; route: RouteDefinition<any, any> }> = []
	for (const [key, value] of entries) {
		if (!isRoute(value)) continue
		if (!seen.has(value)) {
			seen.add(value)
			routes.push({ key, route: value })
		}
	}

	return component({
		name: 'rooted:router',
		onMount({ append, signal }) {

			dev.validateDuplicateRoutes?.(entries, routes)

			let homeEl: GenericComponent | null = null
			let notFoundEl: GenericComponent | null = null
			let activeEl: GenericComponent | null = null
			let lastRouteIdx = -1
			let lastParams: string | undefined

			const update = () => {
				const isHome = location.pathname === '/'

				// Find best-match route (highest end position)
				let bestIdx = -1
				let bestEnd = -1
				let bestParams: Record<string, unknown> = {}
				for (let i = 0; i < routes.length; i++) {
					const result = routes[i]!.route.matchFrom(location.pathname)
					if (result && result.end > bestEnd) {
						bestIdx = i
						bestEnd = result.end
						bestParams = result.params
					}
				}

				// Mount/unmount best-match route component
				const serialized = JSON.stringify(bestParams)
				if (!isHome && (bestIdx !== lastRouteIdx || serialized !== lastParams)) {
					activeEl?.remove()
					activeEl = null
					lastRouteIdx = bestIdx
					lastParams = serialized
					if (bestIdx >= 0) {
						activeEl = append(routes[bestIdx]!.route.component, { gate: bestParams } as any)
					}
				} else if (isHome) {
					activeEl?.remove()
					activeEl = null
					lastRouteIdx = -1
					lastParams = undefined
				}

				// Home
				if (isHome && !homeEl) homeEl = append(home)
				else if (!isHome && homeEl) { homeEl.remove(); homeEl = null }

				// Not found
				const anyMatches = !isHome && bestIdx >= 0
				if (!isHome && !anyMatches && !notFoundEl) notFoundEl = append(notFound)
				else if ((isHome || anyMatches) && notFoundEl) { notFoundEl.remove(); notFoundEl = null }
			}

			window.addEventListener('popstate', update, { signal })
			update()
		}
	})
}
