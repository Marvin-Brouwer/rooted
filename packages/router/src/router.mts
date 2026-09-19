import { Component, component } from '@rooted/components'
import { createComponent } from '@rooted/components/elements'
import { isClient } from '@rooted/util'

import { devHelper } from './dev-helper.mts'
import * as href from './href.mts'
import { NavigateEvent } from './navigate-event.mts'
import { RouteMatch } from './route.match.mts'
import { isRoute, routeMetadata } from './route.metadata.mts'
import { AnyRoute, route } from './route.mts'
import { renderWithViewTransition } from './router.view-transition.mts'
import { currentEntryState, getSavedScrollOffset, registerScrollSaving, restoreScrollOffset, ScrollOffset, scrollToOffset } from './scroll.mts'
import { applyRouteSeoMeta, type RouterSeoOptions } from './seo-meta.mts'

import type { ErrorHandler, NavigateHandler } from './navigate-event.mts'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The origin, where a route that isn't being restored starts. */
const TOP: ScrollOffset = [0, 0]

/**
 * Configuration object passed to {@link router}.
 *
 * - `home`: component rendered at `/`.
 * - `notFound`: component rendered when no route matches the current URL.
 * - All other keys: {@link Route} values registered with the router. The key
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
export type RouterCompatibleRoute<G> = G extends AnyRoute ? G : never

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
 * - `viewTransition`: wrap route renders in `document.startViewTransition`
 *   when available. Default: `false`.
 * - `scrollBehavior`: control scroll-to-top and scroll restoration behaviour.
 * - `on`: lifecycle event handlers.
 */
export type RouterOptions = {
	/** Wrap route renders in `document.startViewTransition` when available. Default: `false`. */
	viewTransition?: boolean
	scrollBehavior?: {
		/**
		 * When to scroll to the top of the page during a navigation. Both axes,
		 * so a horizontally scrolled page starts a new route at the left too.
		 * - `'on:start'`: scroll before the route resolves
		 * - `'on:end'`: scroll after the route renders
		 * - `'on:start-and-end'`: scroll both before and after (default)
		 * - `'skip'`: never scroll to top automatically
		 */
		scrollToTop?: 'on:start' | 'on:end' | 'on:start-and-end' | 'skip'
		/**
		 * When `true` (default), the scroll position is written onto the history
		 * entry a navigation leaves behind, and restored when you come back to it.
		 *
		 * How complete that is depends on the browser. With the Navigation API it
		 * covers back and forward both, because a traversal can save on its way
		 * out. Without it only pushes save, so an entry you left with the back or
		 * forward button keeps whatever the last push wrote, and the newest entry
		 * in the stack has nothing and starts at the top.
		 *
		 * Setting this also takes over from the browser
		 * (`history.scrollRestoration = 'manual'`) for as long as a router is
		 * mounted.
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
	/** Runtime SEO meta tag injection options. */
	seo?: RouterSeoOptions
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

		...Object.values(userRoutes as Record<string, AnyRoute>)
			.filter(r => isRoute(r))
			.filter(r => !r[routeMetadata].hasErrors),
	]

	devHelper.validateDuplicateRoutes?.(config)

	return component<RouterOptions>({
		name: '@rooted/router',
		async onMount({ replace, create, on, options, element, signal }) {
			const {
				viewTransition = false,
				scrollBehavior: {
					scrollToTop = 'on:start-and-end',
					saveScrollBeforeNavigate = true,
					target: scrollTarget,
				} = {},
				on: handlers,
				seo: seoOptions,
			} = options ?? {}

			let lastPath: string | undefined

			let scrollId: string | undefined
			if (saveScrollBeforeNavigate && isClient()) {
				// `navigate` is a free function and can't see these options, so this
				// router joins the registry for as long as it's mounted, and its
				// position rides along on the history entry under this id.
				const registration = registerScrollSaving(scrollTarget)
				scrollId = registration.id
				signal.addEventListener('abort', registration.unregister)
			}

			function scrollTo(offset: ScrollOffset) {
				scrollToOffset(offset, scrollTarget)
			}

			function renderRoute(element?: Element) {
				replace(element ?? create(notFoundComponent))
			}

			function applyTransition(render: () => void) {
				if (viewTransition) renderWithViewTransition(render)
				else render()
			}

			async function update() {
				const target = normalizeHref(href.current)

				if (target.pathOnly === lastPath) return
				lastPath = target.pathOnly

				const currentHref = target.href
				// Read the entry we've landed on rather than the popstate event's
				// state: same value on a navigation, but it also works on mount,
				// which is what restores scroll after a reload.
				const savedOffset = scrollId === undefined ? undefined : getSavedScrollOffset(currentEntryState(), scrollId)

				// Scroll to top on:start
				if (savedOffset === undefined && (scrollToTop === 'on:start' || scrollToTop === 'on:start-and-end')) {
					scrollTo(TOP)
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
						const seo = await resolveSeo(matchRouteResult.route, matchRouteResult.match)
						applyRouteSeoMeta(seo, target.pathOnly, seoOptions, element)
						applyTransition(() => renderRoute(matchRouteResult.element))
					}
				}
				finally {
					handlers?.navigate?.(new NavigateEvent('end', currentHref))
				}

				// Scroll restoration after render. The route's content isn't in the
				// DOM yet, so this keeps re-applying for a few frames.
				if (savedOffset !== undefined) {
					restoreScrollOffset(savedOffset, scrollTarget)
				}
				else if (scrollToTop === 'on:end' || scrollToTop === 'on:start-and-end') {
					scrollTo(TOP)
				}
			}

			on('window', 'popstate', () => update())
			await update()
		},
	})
}

type SuccessRouteMatch = RouteMatch<any> & { success: true }

// Evaluates a lazy seo resolver with the matched tokens, once per navigation
async function resolveSeo(route: AnyRoute, match: SuccessRouteMatch) {
	const seo = route[routeMetadata].seo
	if (typeof seo !== 'function') return seo
	return await seo({ tokens: match.tokens })
}
type FilterRoutesResult
	= { kind: 'match', route: AnyRoute, match: SuccessRouteMatch, element: Element }
	| { kind: 'error', error: Error, route: AnyRoute }
	| undefined

type FilterRouteResult
	= { kind: 'no-match' }
	| { kind: 'suppressed', patternLength: number }
	| { kind: 'matched', match: SuccessRouteMatch, element: Element }
	| { kind: 'error', error: Error, route: AnyRoute }

async function filterRoute(route: AnyRoute, target: href.Path): Promise<FilterRouteResult> {
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

async function matchRoute(target: href.Path, routes: AnyRoute[]): Promise<FilterRoutesResult> {
	// Find the best filtered route in parallel
	const results = await Promise.all(routes.map(async route => ({
		route,
		result: await filterRoute(route, target),
	})))

	let best: { kind: 'match', route: AnyRoute, match: SuccessRouteMatch, element: Element } | undefined
	let errorResult: { kind: 'error', error: Error, route: AnyRoute } | undefined
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

	// Suppression: a longer structural match was filtered, treat as no match.
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
