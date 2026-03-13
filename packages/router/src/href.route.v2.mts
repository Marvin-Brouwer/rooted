import { tupleResult } from '@rooted/util'
import { isParameterToken, isWildcardParameter, TokenMatchResult } from './route.tokens.v2.mts'
import { isRoute, Route, RouteParameterDictionary, routePartsBrand } from './route.v2.mts'

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
// TODO This dictionary HAS to include the parent parameters too, or we only allow link building for this part of the route and the user should combine them?
// If we choose the latter, href.for() should accept multiple routes, not sure if that's feasible as href.for(...routes, parameters) Typescript doesn't support spread
// if it's not the last parameter
export function buildPathForRoute<TRoute extends Route<any>>(route: TRoute, parameters: RouteParameterDictionary<TRoute>) {

	function buildUrl() {
		let url = ''

		for (const part of route[routePartsBrand]) {
			// TODO, currently this doesn't work, the parent information gets lost in types, so these values aren't present.
			if (isRoute(part)) {
				url += buildPathForRoute(part, parameters)
				continue
			}
			if (!isParameterToken(part)) {
				url += part
				continue
			}
			if (isWildcardParameter(part)) {
				url += parameters[part.key as keyof typeof parameters]
				continue
			}
			if (isParameterToken(part)) {
				// Feed through the matcher again to validate the value
				const result = part.match(parameters[part.key as keyof typeof parameters] as any) as TokenMatchResult<any>
				if (tupleResult.isError(result)) return result
				const [, value] = result
				url += value
				continue
			}

			return tupleResult.error(Object.assign(new Error(`Unrecognized route part '${part}'`), { part }))
		}

		return tupleResult.success(url)
	}

	const [success, value, error] = buildUrl()
	if (!success) throw error
	return value
}