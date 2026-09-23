import { createComponent } from '@rooted/components/elements'

import * as href from './href.mts'
import { RouteMatch } from './route.match.mts'
import { routeMetadata } from './route.metadata.mts'
import { AnyRoute } from './route.mts'

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SuccessRouteMatch = RouteMatch<any> & { success: true }

type MatchedRoute = { kind: 'match', route: AnyRoute, match: SuccessRouteMatch, element: Element }
type ErroredRoute = { kind: 'error', error: Error, route: AnyRoute, patternLength: number }

export type MatchRouteResult = MatchedRoute | ErroredRoute | undefined

type FilterRouteResult
	= { kind: 'no-match' }
	| { kind: 'suppressed', patternLength: number }
	| { kind: 'matched', match: SuccessRouteMatch, element: Element }
	| ErroredRoute

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
		return { kind: 'error', error, route, patternLength: patternMatch.length }
	}
}

// Longer wins. At equal length, a route without a wildcard beats one with.
function isMoreSpecific(length: number, route: AnyRoute, thanLength: number, thanRoute: AnyRoute) {
	if (length !== thanLength) return length > thanLength
	return !route[routeMetadata].hasWildcard && thanRoute[routeMetadata].hasWildcard
}

/**
 * Evaluates every route against `target` in parallel and picks the one to render.
 *
 * A route whose `resolve` throws competes on the same terms as one that resolved,
 * so a failing specific route isn't hidden behind a broader fallback.
 * Returns `undefined` when nothing matches, or when a longer route suppressed the URL.
 */
export async function matchRoute(target: href.Path, routes: AnyRoute[]): Promise<MatchRouteResult> {
	const results = await Promise.all(routes.map(async route => ({
		route,
		result: await filterRoute(route, target),
	})))

	let best: MatchedRoute | undefined
	let errorResult: ErroredRoute | undefined
	let highestSuppressedLength = -1

	for (const { route, result } of results) {
		if (result.kind === 'error') {
			if (!errorResult || isMoreSpecific(result.patternLength, route, errorResult.patternLength, errorResult.route)) {
				errorResult = result
			}
			continue
		}
		if (result.kind === 'suppressed') {
			highestSuppressedLength = Math.max(highestSuppressedLength, result.patternLength)
			continue
		}
		if (result.kind !== 'matched') continue

		if (!best || isMoreSpecific(result.match.length, route, best.match.length, best.route)) {
			best = { kind: 'match', route, match: result.match, element: result.element }
		}
	}

	// Suppression: a longer structural match was filtered, treat that candidate as no match.
	if (best && highestSuppressedLength > best.match.length) best = undefined
	if (errorResult && highestSuppressedLength > errorResult.patternLength) errorResult = undefined

	if (errorResult && (!best || isMoreSpecific(errorResult.patternLength, errorResult.route, best.match.length, best.route))) {
		return errorResult
	}

	return best
}
