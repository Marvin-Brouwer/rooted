import { tupleResult } from '@rooted/util'
import type { TokenMatchResult } from './route.tokens.v2.mts'
import * as tokens from './route.tokens.v2.mts'
import type { Route, RouteParameterDictionary } from './route.v2.mts'
import * as route_ from './route.v2.mts'

/**
 * Utility to generate an absolute path back from the route definition
 *
 * @param parameters - A key value dictionary of the expected parameter values, similar to `options.gate`
 * @returns A constructed url with the values from the {@param parameters} interpolated.
 *
 * @example
 * ```ts
 * create(Link, {
 * 	className: 'category-card',
 * 	// actually `href.for(CategoryRoute, { slug: category.slug })` but the shape fits so the shorthand is preferred
 * 	href: href.for(CategoryRoute, category),
 * 	children: [
 * 		create('div', { className: 'category-name', textContent: category.label }),
 * 		create('p', {
 * 			className: 'category-count',
 * 			textContent: `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`,
 * 		}),
 * 	],
 * })
 * ```
 */
export function buildPathForRoute<TRoute extends Route<any>>(route: TRoute, parameters: RouteParameterDictionary<TRoute>) {

	function buildUrl() {
		let url = ''

		for (const part of route[route_.routePartsBrand]) {
			if (route_.isRoute(part)) {
				url += buildPathForRoute(part, parameters as RouteParameterDictionary<typeof part>)
				continue
			}
			if (!tokens.isParameterToken(part)) {
				url += part
				continue
			}
			if (tokens.isWildcardParameter(part)) {
				url += parameters[part.key as keyof typeof parameters]
				continue
			}
			if (tokens.isParameterToken(part)) {
				// Feed through the matcher again to validate the value
				const result = part.match(parameters[part.key as keyof typeof parameters] as any) as TokenMatchResult<any>
				if (tupleResult.isError(result)) return result
				url += tupleResult.value(result)
				continue
			}

			return tupleResult.error(Object.assign(new Error(`Unrecognized route part '${part}'`), { part }))
		}

		return tupleResult.success(url)
	}

	const urlResult = buildUrl()
	return tupleResult.unTuple(urlResult)
}