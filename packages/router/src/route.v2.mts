import type { Component } from '@rooted/components'
import { isParameterToken, isWildcardParameter, type Parameter, type ParameterToValueType, type RouteParameter, token, wildcard } from './route.tokens.v2.mts'
import { type MatchRouteOptions, type RouteMatch, routeMatcher } from './route.match.v2.mts'

/** The typed path token descriptors declared with {@link token}. */
export const tokenTypes: unique symbol = Symbol.for('rooted:typed-parameter')
/** Internal brand that identifies a {@link RouteDefinition}. */
export const routeBrand: unique symbol = Symbol.for('rooted:route')
/** Internal brand that identifies the split up route parts. */
export const routePartsBrand: unique symbol = Symbol.for('rooted:routeParts')

/** Returns `true` if `token` is a {@link WildcardParameter}. */
export function isRoute<T extends Parameter[]>(instance: unknown): instance is Route<RouteParameters<T>>
export function isRoute(instance: unknown): instance is Route<any> {
	return typeof instance === 'object' && instance !== null && routeBrand in instance
}

type ConvertPathParameters<T extends readonly Parameter[]> = {
	[P in T[number]as P['key']]: ParameterToValueType<P['type']>
}

export type FilterOutParent<T extends readonly RouteParameter[]> =
	T extends readonly [infer H, ...infer R extends readonly Parameter[]]
	? H extends Parameter
	? [H, ...FilterOutParent<R>]
	: FilterOutParent<R>
	: []

export type ExtractParent<T extends readonly RouteParameter[]> =
	T extends readonly [infer H, ...infer R extends readonly RouteParameter[]]
	? H extends Route<any>
	? H
	: ExtractParent<R>
	: never

export type PathParameterDictionary<T extends readonly RouteParameter[]> = ConvertPathParameters<FilterOutParent<T>>
export type RouteParameterDictionary<TRoute extends Route<any>> = Required<PathParameterDictionary<TRoute[typeof tokenTypes]>>

type EmptyComponent = Component<{}> | Component<never>
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
export type RouteFilter<T extends readonly Parameter[]> = (parameters: PathParameterDictionary<T>) => boolean | Promise<boolean>

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

export type RouteParameters<T extends Parameter[]> = {
	parameters: FilterOutParent<T>,
	component: RoutableComponent<FilterOutParent<T>>,
	parent?: ExtractParent<T> | any
}

export type Route<T extends RouteParameters<Parameter[]>> = {

	/** The destination component rendered when this route is the best match. */
	readonly component: T['component']
	/** The typed path token descriptors declared with {@link token}. */
	readonly [tokenTypes]: T['parameters']
	/** Brand that identifies this object as a {@link Route}. */
	readonly [routeBrand]: true
	/** Brand that identifies the split up route parts */
	readonly [routePartsBrand]: Array<string | RouteParameter>
	/** `true` if this route's pattern includes any {@link Parameter}s. */
	readonly hasParameterTokens: boolean
	/** `true` if this route's pattern ends with a {@link wildcard} parameter. */
	readonly hasWildcard: boolean

	/**
	 * Simplified api, combination of previous match, patternMatchFrom and matchFrom
	 * @todo redoc
	 */
	match(options?: MatchRouteOptions): Promise<RouteMatch<T['parameters']>>
}

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
	// How this invalid route looks like isn't determined yet, either way the manifest should pass it through and the router should
	// know to ignore it.
	// Perhaps returning an Error instead of a route will work, perhaps an invalid route type is also fine.
	// dev.logRouteWarnings.(warnings)

	const routeParts = zipTemplateParts(strings, values)

	return (component, filter) => {

		// TODO cache for match and link based on full input, erase on navigate? or ttl? or set length queue? use weakmap?
		// Do we want a shared store or per route?

		const lastValue = values.at(-1)
		const hasWildcard = !!lastValue && isWildcardParameter(lastValue as Parameter)
		const match = routeMatcher<T>(routeParts, filter)

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