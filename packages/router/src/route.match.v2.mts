import { tupleResult } from '@rooted/util'
import { href, Path, Url } from './href.mts'
import { isParameterToken, Parameter, RouteParameter, TokenMatchResult } from './route.tokens.v2.mts'
import { FilterOutParent, PathParameterDictionary, RouteFilter } from './route.v2.mts'

export type RouteMatch<T extends Parameter[]> = {
	success: true,
	tokens: PathParameterDictionary<T>
} | {
	success: false
}

export type MatchRouteOptions = {
	target?: string | Path | Url | URL | Location
	offset?: number,
	/** @default true */
	applyFilters?: boolean
	/** Checks if there's any url left after all parts match, and fails if true, @default true */
	checkInclusive?: boolean
}

export function routeMatcher<T extends RouteParameter[]>(routeParts: Array<string | RouteParameter>, filter?: RouteFilter<FilterOutParent<T>> | undefined) {

	// TODO, maybe this should be a cursor style check?
	function matchUrlPath(path: Path, checkInclusive: boolean) {

		let offset = 0
		let parentParameters: Partial<PathParameterDictionary<any>> = {}
		let parameters: Partial<PathParameterDictionary<T>> = {}

		for (const part of routeParts) {
			if (typeof part === 'string') {
				if (part !== path.pathOnly.slice(offset, part.length)) return tupleResult.error(`Path did not match '${part}'`)
				offset += part.length
				continue
			}

			if (!isParameterToken(part)) {
				// TODO do we want this recursive approach, or should this be the routers responsibility,
				// if we move this to the router, the route simplifies, however,
				// this means gates have no way of accessing parent parameters.
				// Perhaps a route.getParameters(url|location|path) would help here?
				// That way a gate will either show or not, but we no longer have to forward the parent route params
				// and maybe a gate will also have gate.getParameters(url|location|path), in case a route is not exported and only used in a gate?
				const result = part.match({ target: path.pathOnly.slice(offset), checkInclusive: false })
				if (!result.success) return tupleResult.error(`Path did not match Parent`)

				parentParameters = result.tokens

				continue
			}

			const nextPart = path.pathOnly.slice(offset)
			const [success, result, error] = part.match(nextPart.slice(0, nextPart.indexOf('/'))) as TokenMatchResult<any>
			if (success === false) return tupleResult.error(error)

			parameters[part.key as keyof typeof parameters] = result
		}

		if (checkInclusive && path.pathOnly.slice(offset) !== '') return tupleResult.error('Route was longer than path')
		return tupleResult.success(Object.freeze({ ...parentParameters, ...parameters }) as unknown as PathParameterDictionary<T>)
	}

	function getPath(target?: MatchRouteOptions['target']) {
		if (typeof target === 'string') return href.path(target)
		if (target instanceof Path) return target
		if (target instanceof Url) return target.path
		if (target instanceof URL) return href.for(target).path
		if (target instanceof Location) return href.for(target).path

		return href.current()
	}

	function match(options?: MatchRouteOptions): RouteMatch<FilterOutParent<T>> {

		const path = getPath(options?.target)
		const applyFilters = options?.applyFilters ?? true
		const checkInclusive = options?.checkInclusive ?? true

		const pathMatch = matchUrlPath(path, checkInclusive)
		if (tupleResult.isError(pathMatch)) return {
			success: false
		}
		const [success, tokens] = pathMatch

		if (applyFilters && !filter?.(tokens)) return { success: false }

		return {
			success,
			tokens
		}
	}

	return match
}