import { tupleResult } from '@rooted/util'
import type { Path, Url } from './href.mts'
import { isParameterToken, type Parameter, type RouteParameter, type TokenMatchResult } from './route.tokens.v2.mts'
import type { FilterOutParent, PathParameterDictionary } from './route.v2.mts'

export type RouteMatch<T extends Parameter[]> = {
	success: true,
	tokens: PathParameterDictionary<T>,
	length: number
} | {
	success: false
}

export type MatchRouteOptions = {
	target?: string | Path | Url | URL | Location
	offset?: number,
	/** Checks if there's any url left after all parts match, and fails if true, @default true */
	checkInclusive?: boolean
}

export function routeMatcher<T extends RouteParameter[]>(routeParts: Array<string | RouteParameter>) {

	// This import caused circular references
	let href: typeof import('./href.mts')

	// TODO, maybe this should be a cursor style check?
	async function matchUrlPath(path: Path, checkInclusive: boolean) {

		href ??= await import('./href.mts')

		let offset = 0
		let parentParameters: Partial<PathParameterDictionary<any>> = {}
		let parameters: Partial<PathParameterDictionary<T>> = {}

		for (const part of routeParts) {
			if (typeof part === 'string') {
				if (part !== path.pathOnly.slice(offset, offset + part.length)) return tupleResult.error(`Path did not match '${part}'`)
				offset += part.length
				continue
			}

			if (!isParameterToken(part)) {
				const result = await part.match({ target: path.pathOnly.slice(offset), checkInclusive: false })
				if (!result.success) return tupleResult.error(`Path did not match Parent`)

				parentParameters = result.tokens
				offset += result.length
				continue
			}

			const nextPart = path.pathOnly.slice(offset)
			const segment = nextPart.slice(0, nextPart.indexOf('/'))
			const matchResult = part.match(segment) as TokenMatchResult<any>
			if (tupleResult.isError(matchResult)) return matchResult

			parameters[part.key as keyof typeof parameters] = tupleResult.value(matchResult)
			offset += segment.length
		}

		if (checkInclusive && path.pathOnly.slice(offset) !== '') return tupleResult.error('Route was longer than path')
		return tupleResult.success<[tokens: PathParameterDictionary<T>, offset: number]>([Object.freeze({ ...parentParameters, ...parameters }) as any, offset])
	}

	function getPath(target?: MatchRouteOptions['target']) {
		if (typeof target === 'string') return href.path(target)
		if (target instanceof href.Path) return target
		if (target instanceof href.Url) return target.path
		if (target instanceof URL) return href.forAny(target).path
		if (target instanceof Location) return href.forAny(target).path

		return href.current()
	}

	async function match(options?: MatchRouteOptions): Promise<RouteMatch<FilterOutParent<T>>> {

		const path = getPath(options?.target)
		const checkInclusive = options?.checkInclusive ?? true

		const pathMatch = await matchUrlPath(path, checkInclusive)
		if (tupleResult.isError(pathMatch)) return {
			success: false
		}
		const [tokens, offset] = tupleResult.value(pathMatch)

		return {
			success: true,
			tokens,
			length: offset
		}
	}

	return match
}