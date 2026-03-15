import { tupleResult } from '@rooted/util'
import type { TokenMatchResult } from './route.tokens.mts'
import * as tokens from './route.tokens.mts'
import type { Route, RouteParameterDictionary } from './route.mts'
import { isRoute, routeMetaData } from './route.metadata.mts'

/**
 * @internal Builds a path string from a route and its parameter dictionary.
 * Each token value is fed back through its own matcher for validation.
 * Throws if any token value is invalid or an unrecognized part is encountered.
 */
export function buildPathForRoute<TRoute extends Route<any>>(route: TRoute, parameters: RouteParameterDictionary<TRoute>) {

	function buildUrl() {
		let url = ''

		for (const part of route[routeMetaData].routeParts) {
			if (isRoute(part)) {
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