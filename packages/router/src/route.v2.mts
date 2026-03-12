import { Component } from '@rooted/components'
import { isParameterToken, isWildcardParameter, ParameterToken, ParameterToValueType, RouteParameter, token, TokenMatchResult, wildcard } from './route.tokens.v2.mts'
import { tupleResult } from '@rooted/util'

/** The typed path token descriptors declared with {@link token}. */
export const tokenTypes: unique symbol = Symbol.for('rooted:typed-parameter')
/** Internal brand that identifies a {@link RouteDefinition}. */
export const routeBrand: unique symbol = Symbol.for('rooted:route')

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

type PathParameterDictionary<T extends readonly RouteParameter[]> = ConvertPathParams<FilterOutParent<T>>

export type RouteMatch<T extends ParameterToken[]> = {
	success: true,
	tokens: PathParameterDictionary<T>
} | {
	success: false
}

export type MatchRouteOptions = {
	target?: string | URL | Location
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

type RouteParameters<T extends ParameterToken[]> = {
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
	/** `true` if this route's pattern includes any {@link ParameterToken}s. */
	readonly hasParameterTokens: boolean
	/** `true` if this route's pattern ends with a {@link wildcard} parameter. */
	readonly hasWildcard: boolean

	/**
	 * Simplified api, combination of previous match, patternMatchFrom and matchFrom
	 * @todo redoc
	 */
	match(options?: MatchRouteOptions): RouteMatch<T['parameters']>

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
	 * 	// actually `CategoryRoute.link({ slug: category.slug })` but the shape fits so the shorthand is preferred
	 * 	href: CategoryRoute.link(category),
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
	link(parameters: PathParameterDictionary<T['parameters']>): string
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

const l = r.link({ id: 1, time: new Date() })
const m = r.match({
	target: l
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
	function matchUrlPath(path: string, checkInclusive: boolean) {

		let offset = 0
		let parameters: Partial<PathParameterDictionary<T>> = {}

		for (const part of routeParts) {
			if (typeof part === 'string') {
				if (part !== path.slice(offset, part.length)) return tupleResult.error(`Path did not match '${part}'`)
				offset += part.length
				continue
			}

			if (!isParameterToken(part)) {
				// TODO how do we do parent?
				// And how do we get the parameters out
				if (!part.match({ target: path.slice(offset), checkInclusive: false })) return tupleResult.error(`Path did not match Parent`)
				continue
			}

			const nextPart = path.slice(offset)
			const [success, result, error] = part.match(nextPart.slice(0, nextPart.indexOf('/'))) as TokenMatchResult<any>
			if (success === false) return tupleResult.error(error)

			parameters[part.key as keyof typeof parameters] = result
		}

		if (checkInclusive && path.slice(offset) !== '') return tupleResult.error('Route was longer than path')
		return tupleResult.success(Object.freeze(parameters) as unknown as PathParameterDictionary<T>)
	}

	function buildUrl(parameters: PathParameterDictionary<T>) {
		let url = ''

		for (const part of routeParts) {
			// TODO, currently this doesn't work, the parent information gets lost.
			if (isRoute(part)) {
				url += part.link(routeParts)
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

	return (component, filter) => {

		// TODO cache for match and link based on full input, erase on navigate? or ttl? or set length queue? use weakmap?
		// Do we want a shared store or per route?

		const lastValue = values.at(-1)
		const hasWildcard = !!lastValue && isWildcardParameter(lastValue as ParameterToken)

		// TODO This dictionary HAS to include the parent parameters too
		function link(parameters: PathParameterDictionary<T>) {
			const [success, value, error] = buildUrl(parameters)
			if (!success) throw error
			return value
		}

		function match(options?: MatchRouteOptions): RouteMatch<FilterOutParent<T>> {

			const path = (typeof options?.target === 'string' ? options?.target : options?.target?.pathname) ?? location.pathname
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

			component,

			hasParameterTokens: values.length > 0,
			hasWildcard,

			link,
			match
		}
	}
}