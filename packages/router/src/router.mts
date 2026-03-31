import { Component, component } from '@rooted/components'
import { createComponent } from '@rooted/components/elements'
import { isClient } from '@rooted/util'

import { devHelper } from './dev-helper.mts'
import * as href from './href.mts'
import { NavigateEvent } from './navigate-event.mts'
import { RouteMatch } from './route.match.mts'
import { isRoute, routeMetadata } from './route.metadata.mts'
import { Route, route } from './route.mts'
import { getSavedScrollPosition } from './scroll.mts'

import type { ErrorHandler, NavigateHandler } from './navigate-event.mts'

/* eslint-disable @typescript-eslint/no-explicit-any */

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
 * Options passed to the router component at mount time.
 *
 * - `viewTransition` — wrap route renders in `document.startViewTransition`
 *   when available. Default: `false`.
 * - `scrollBehavior` — control scroll-to-top and scroll restoration behaviour.
 * - `on` — lifecycle event handlers.
 */
export type RouterOptions = {
	/** Wrap route renders in `document.startViewTransition` when available. Default: `false`. */
	viewTransition?: boolean
	scrollBehavior?: {
		/**
		 * When to scroll to the top of the page during a navigation.
		 * - `'on:start'` — scroll before the route resolves
		 * - `'on:end'` — scroll after the route renders
		 * - `'on:start-and-end'` — scroll both before and after (default)
		 * - `'skip'` — never scroll to top automatically
		 */
		scrollToTop?: 'on:start' | 'on:end' | 'on:start-and-end' | 'skip'
		/**
		 * When `true` (default), the current scroll position is saved before
		 * push navigations so it can be restored on back/forward navigation.
		 */
		saveScrollBeforeNavigate?: boolean
		/**
		 * Custom scroll container. When omitted, `window` is used.
		 */
		target?: Element
	}
	on?: {
		navigate?: NavigateHandler
		error?: ErrorHandler
	}
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
export function router<const T extends RouterConfig>(config: ValidatedRouterConfig<T>): Component<RouterOptions> {
	const { home: homeComponent, notFound: notFoundComponent, ...userRoutes } = config

	const routes = [
		route`/`({ resolve: ({ create }) => create(homeComponent) }),

		...Object.values(userRoutes as Record<string, Route<any>>)
			.filter(r => isRoute(r))
			.filter(r => !r[routeMetadata].hasErrors),
	]

	devHelper.validateDuplicateRoutes?.(config)

	return component<RouterOptions>({
		name: '@rooted/router',
		async onMount({ replace, create, on, options }) {
			const {
				viewTransition = false,
				scrollBehavior: {
					scrollToTop = 'on:start-and-end',
					saveScrollBeforeNavigate = true,
					target: scrollTarget,
				} = {},
				on: handlers,
			} = options ?? {}

			let lastPath: string | undefined

			function scrollTo(y: number) {
				if (!isClient()) return
				if (scrollTarget) {
					if (y === 0) scrollTarget.scrollTo?.({ top: 0, behavior: 'instant' })
					else scrollTarget.scrollTop = y
				}
				else {
					window.scrollTo({ top: y, behavior: 'instant' })
				}
			}

			function renderRoute(element?: Element) {
				replace(element ?? create(notFoundComponent))
			}

			function applyTransition(render: () => void) {
				if (viewTransition && isClient() && 'startViewTransition' in document)
					(document as Document & { startViewTransition(callback: () => void): void }).startViewTransition(render)
				else
					render()
			}

			async function update(incomingState?: unknown) {
				const target = normalizeHref(href.current)

				if (target.pathOnly === lastPath) return
				lastPath = target.pathOnly

				const currentHref = target.href
				const savedScrollY = saveScrollBeforeNavigate ? getSavedScrollPosition(incomingState) : undefined

				// Scroll to top on:start
				if (!savedScrollY && (scrollToTop === 'on:start' || scrollToTop === 'on:start-and-end')) {
					scrollTo(0)
				}

				handlers?.navigate?.(new NavigateEvent('start', currentHref))

				try {
					const matchRouteResult = await matchRoute(target, routes)
					if (!matchRouteResult) {
						applyTransition(() => renderRoute())
					}
					else if (matchRouteResult.kind === 'error') {
						applyTransition(() => renderRoute())
					}
					else {
						applyTransition(() => renderRoute(matchRouteResult.element))
					}
				}
				finally {
					handlers?.navigate?.(new NavigateEvent('end', currentHref))
				}

				// Scroll restoration after render
				if (savedScrollY !== undefined) {
					scrollTo(savedScrollY)
				}
				else if (scrollToTop === 'on:end' || scrollToTop === 'on:start-and-end') {
					scrollTo(0)
				}
			}

			on('window', 'popstate', (event: PopStateEvent) => update(event.state))
			await update()
		},
	})
}

type SuccessRouteMatch = RouteMatch<any> & { success: true }
type FilterRoutesResult
	= { kind: 'match', route: Route<any>, match: SuccessRouteMatch, element: Element }
	| { kind: 'error', error: Error, route: Route<any> }
	| undefined

type FilterRouteResult
	= { kind: 'no-match' }
	| { kind: 'suppressed', patternLength: number }
	| { kind: 'matched', match: SuccessRouteMatch, element: Element }
	| { kind: 'error', error: Error, route: Route<any> }

async function filterRoute(route: Route<any>, target: href.Path): Promise<FilterRouteResult> {
	const patternMatch = await route.match({ target })
	if (!patternMatch.success) return { kind: 'no-match' }

	try {
		const element = await route.resolve({ create: createComponent, tokens: patternMatch.tokens })
		if (!element) return { kind: 'suppressed', patternLength: patternMatch.length }

		return { kind: 'matched', match: patternMatch, element }
	}
	catch (rawError) {
		const error = rawError instanceof Error ? rawError : new Error(String(rawError))
		return { kind: 'error', error, route }
	}
}

async function matchRoute(target: href.Path, routes: Route<any>[]): Promise<FilterRoutesResult> {
	// Find the best filtered route in parallel
	const results = await Promise.all(routes.map(async route => ({
		route,
		result: await filterRoute(route, target),
	})))

	let best: { kind: 'match', route: Route<any>, match: SuccessRouteMatch, element: Element } | undefined
	let errorResult: { kind: 'error', error: Error, route: Route<any> } | undefined
	let highestSuppressedLength = -1

	for (const { route, result } of results) {
		if (result.kind === 'error') {
			errorResult = result
			continue
		}
		if (result.kind === 'suppressed') {
			highestSuppressedLength = Math.max(highestSuppressedLength, result.patternLength)
			continue
		}
		if (result.kind !== 'matched') continue

		if (!best || result.match.length > best.match.length) {
			best = { kind: 'match', route, match: result.match, element: result.element }
			continue
		}
		// Equal length: non-wildcard beats wildcard (more specific wins)
		if (result.match.length === best.match.length && !route[routeMetadata].hasWildcard && best.route[routeMetadata].hasWildcard) {
			best = { kind: 'match', route, match: result.match, element: result.element }
		}
	}

	// Suppression: a longer structural match was filtered — treat as no match
	if (best && highestSuppressedLength > best.match.length) return undefined

	// If we have a valid best match, return it
	if (best) return best

	// If no match and there was an error, propagate the error
	if (errorResult) return errorResult

	return undefined
}

function normalizeHref(target: () => href.Path) {
	const targetPath = target()
	if (!targetPath.pathOnly.endsWith('/')) {
		// Use location.pathname (which includes the app base) so replaceState
		// doesn't strip the base from the browser URL.
		history.replaceState(history.state, '', location.pathname + '/' + targetPath.queryString + targetPath.hash)
		return target()
	}

	return targetPath
}
