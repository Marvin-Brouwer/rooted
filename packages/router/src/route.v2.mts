import { Component } from '@rooted/components'
import { isParameterToken, isWildcardParameter, ParameterToken, ParameterToValueType, RouteParameter, token, TokenMatchResult, wildcard } from './route.tokens.v2.mts'
import { tupleResult } from '@rooted/util'
import { href, Path, Url } from './href.mts'

/** The typed path token descriptors declared with {@link token}. */
export const tokenTypes: unique symbol = Symbol.for('rooted:typed-parameter')
/** Internal brand that identifies a {@link RouteDefinition}. */
export const routeBrand: unique symbol = Symbol.for('rooted:route')
/** Internal brand that identifies the split up route parts. */
export const routePartsBrand: unique symbol = Symbol.for('rooted:routeParts')

/** Returns `true` if `token` is a {@link WildcardParameter}. */
export function isRoute<T extends ParameterToken[]>(instance: unknown): instance is Route<RouteParameters<T>>
export function isRoute(instance: unknown): instance is Route<any> {
	return typeof instance === 'object' && instance !== null && routeBrand in instance
}

type ConvertPathParams<T extends readonly ParameterToken[]> = {
	[P in T[number]as P['key']]: ParameterToValueType<P['type']>
}

type FilterOutParent<T extends readonly RouteParameter[]> =
	T extends readonly [infer H, ...infer R extends readonly ParameterToken[]]
	? H extends ParameterToken
	? [H, ...FilterOutParent<R>]
	: FilterOutParent<R>
	: []

type ExtractParent<T extends readonly RouteParameter[]> =
	T extends readonly [infer H, ...infer R extends readonly RouteParameter[]]
	? H extends Route<any>
	? H
	: ExtractParent<R>
	: never

export type PathParameterDictionary<T extends readonly RouteParameter[]> = ConvertPathParams<FilterOutParent<T>>
export type RouteParameterDictionary<TRoute extends Route<any>> = Required<PathParameterDictionary<TRoute[typeof tokenTypes]>>

export type RouteMatch<T extends ParameterToken[]> = {
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

type EmptyComponent = Component<{}> | Component<never> // TODO which of the two?
export type RoutableComponent<T extends RouteParameter[]> = EmptyComponent | Component<{ path?: Partial<PathParameterDictionary<FilterOutParent<T>>> }>

/**
 * An optional filter passed as the second argument to the {@link route} binder.
 *
 * When provided, the filter is called after the URL pattern matches. Returning
 * `false` causes the route to be treated as a non-match and the `notFound`
 * component will render. Crucially, a filtered-out route **blocks** any
 * shorter parent route from matching as a fallback — if the URL was claimed by
 * this pattern, the router will not fall back to a less-specific route.
 *
 * For child routes, the parent's filter is evaluated first (as part of the
 * parent's `matchFrom` call). The child filter only runs if the parent filter
 * passes.
 *
 * @see {@link route}
 */
export type RouteFilter<T extends readonly ParameterToken[]> = (parameters: PathParameterDictionary<T>) => boolean

export type RouteBuilder<T extends RouteParameter[]> = <TComponent extends RoutableComponent<T>>(routedComponent: TComponent, filter?: RouteFilter<FilterOutParent<T>>) =>
	// This is typed with an anonymous object on purpose.
	// It serves as a debug view as well as type information
	ExtractParent<T> extends never
	? Route<{
		parameters: FilterOutParent<T>,
		component: TComponent,
	}>
	: Route<{
		parameters: FilterOutParent<T>,
		component: TComponent,
		parent: ExtractParent<T>
	}>

export type RouteParameters<T extends ParameterToken[]> = {
	parameters: FilterOutParent<T>,
	component: RoutableComponent<FilterOutParent<T>>,
	parent?: ExtractParent<T> | any
}

export type Route<T extends RouteParameters<ParameterToken[]>> = {

	/** The destination component rendered when this route is the best match. */
	readonly component: T['component']
	/** The typed path token descriptors declared with {@link token}. */
	readonly [tokenTypes]: T['parameters']
	/** Brand that identifies this object as a {@link Route}. */
	readonly [routeBrand]: true
	/** Brand that identifies the split up route parts */
	readonly [routePartsBrand]: Array<string | RouteParameter>
	/** `true` if this route's pattern includes any {@link ParameterToken}s. */
	readonly hasParameterTokens: boolean
	/** `true` if this route's pattern ends with a {@link wildcard} parameter. */
	readonly hasWildcard: boolean

	/**
	 * Simplified api, combination of previous match, patternMatchFrom and matchFrom
	 * @todo redoc
	 */
	match(options?: MatchRouteOptions): RouteMatch<T['parameters']>
}


// TODO these are just test values, remove when done
type FakeComponentType = Component<{
	path: {
		id: number,
		time: Date,
		rest: string
	}
}>
const FakeComponent: FakeComponentType = null!
// TODO also allow routeBuilder as base?
const r = route`/start/${token('id', Number)}/${token('time', Date)}/example/`(FakeComponent)
const cr = route`/${r}/start/${token('id', String)}/${token('doThing', Boolean)}/example/${wildcard()}/`(FakeComponent)

const m = r.match({
	target: '/hi/'
})

if (m.success) {
	const t = m.tokens
}
//

function zipTemplateParts<T>(strings: TemplateStringsArray, values: T[]) {
	const parts: Array<string | T> = []

	for (let i = 0; i < values.length; i++) {
		parts.push(strings[i])
		parts.push(values[i])
	}

	parts.push(strings[strings.length - 1])

	return parts
}

// TODO how do we match parent, and how do we build URL with parent?
export function route<const T extends RouteParameter[]>(
	strings: TemplateStringsArray, ...values: T
): RouteBuilder<T> {

	// TODO dev.validatePatternV2?.(strings, values as unknown as ParameterToken[])
	// A better option: 2 parts, validate the pattern, return invalid route if any errors
	// dev.logRouteWarnings.(warnings)

	const routeParts = zipTemplateParts(strings, values)

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

	return (component, filter) => {

		// TODO cache for match and link based on full input, erase on navigate? or ttl? or set length queue? use weakmap?
		// Do we want a shared store or per route?

		const lastValue = values.at(-1)
		const hasWildcard = !!lastValue && isWildcardParameter(lastValue as ParameterToken)

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

		return {

			[routeBrand]: true,
			[tokenTypes]: values.filter(value => !isParameterToken(value)) as FilterOutParent<T>,
			[routePartsBrand]: routeParts,

			component,

			hasParameterTokens: values.length > 0,
			hasWildcard,

			match
		}
	}
}

// TODO @Claude
// I think this implementation is more readable than the V1 router, however I am torn on the way forward.
// Either we include all the information of a parent route and make the code quite complex
// Or we don't include parent information at all, and simplify the type information + users of the library are required to do more gymnastics