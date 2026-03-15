import type { create } from '@rooted/components/elements'
import { isParameterToken, isWildcardParameter, type Parameter, type ParameterToValueType, type RouteParameter, token, wildcard } from './route.tokens.v2.mts'
import { type MatchRouteOptions, type RouteMatch, routeMatcher } from './route.match.v2.mts'
import { dev } from './dev-helper.v2.mts'

/** The typed path token descriptors declared with {@link token}. */
export const tokenTypes: unique symbol = Symbol.for('rooted:typed-parameter')
/** The typed path token descriptors for the parent. */
export const parentType: unique symbol = Symbol.for('rooted:parent-route')

/** Internal brand that identifies a {@link RouteDefinition}. */
export const routeBrand: unique symbol = Symbol.for('rooted:route')
/** Internal brand that identifies the split up route parts. */
export const routePartsBrand: unique symbol = Symbol.for('rooted:routeParts')
/** Internal brand that marks a route as invalid due to pattern errors. */
export const errorBrand: unique symbol = Symbol.for('rooted:route-error')

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

/** Type hack to prevent infinite recursion */
type RecursionCounter = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export type RouteParameterDictionary<TRoute extends Route<any>, D extends number = 10> =
    D extends 0
		? Required<ConvertPathParameters<TRoute[typeof tokenTypes]>>
		: [TRoute[typeof parentType]] extends [never]
			? Required<ConvertPathParameters<TRoute[typeof tokenTypes]>>
			: TRoute[typeof parentType] extends Route<any>
				? Required<ConvertPathParameters<TRoute[typeof tokenTypes]>> & RouteParameterDictionary<TRoute[typeof parentType], RecursionCounter[D]>
				: Required<ConvertPathParameters<TRoute[typeof tokenTypes]>>

/**
 * A function that resolves the element to render for a matched route.
 *
 * Receives a context object with `create` (the component factory) and `tokens`
 * (the typed path parameters). Use `create` to instantiate your component with
 * whatever props you need:
 * ```ts
 * resolve: ({ create, tokens }) => create(MyComponent, { id: tokens.id })
 * ```
 *
 * Returning `undefined` signals a 404 — the route is treated as a non-match
 * and blocks shorter parent routes from matching as a fallback (suppression).
 *
 * When `resolve` is `async`, Vite will split the imported component into a
 * separate bundle chunk. When it is sync, the component stays in the main bundle.
 *
 * @see {@link route}
 */
export type RouteResolver<T extends readonly RouteParameter[]> =
	(context: { create: typeof create, tokens: PathParameterDictionary<T> }) =>
		Element | undefined | Promise<Element | undefined>

export type RouteBuilder<T extends RouteParameter[]> = (definition: { resolve: RouteResolver<T> }) =>
	// This is typed with an anonymous object on purpose.
	// It serves as a debug view as well as type information
	ExtractParent<T> extends never
	? Route<{
		parameters: FilterOutParent<T>,
		resolve: RouteResolver<T>,
	}>
	: Route<{
		parameters: FilterOutParent<T>,
		resolve: RouteResolver<T>,
		parent: ExtractParent<T>
	}>

export type RouteParameters<T extends Parameter[]> = {
	parameters: FilterOutParent<T>,
	resolve: RouteResolver<T>,
	parent?: ExtractParent<T> | any
}

export type Route<T extends RouteParameters<Parameter[]>> = {

	/** Resolves the component to render when this route is the best match. */
	readonly resolve: T['resolve']
	/** The typed path token descriptors declared with {@link token}. */
	readonly [tokenTypes]: T['parameters']
	/** The typed path token descriptors for the parent. */
	readonly [parentType]: T extends { parent: infer P extends Route<any> } ? P : never

	/** Brand that identifies this object as a {@link Route}. */
	readonly [routeBrand]: true
	/** Set to `true` when the route pattern has validation errors. Filtered out by the router. */
	readonly [errorBrand]?: true
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

function reconstructPattern(strings: TemplateStringsArray, values: readonly RouteParameter[]): string {
	return Array.from(strings).reduce((acc, str, i) => {
		if (i === 0) return str
		const v = values[i - 1]!
		let label: string
		if (isRoute(v)) label = '${Route}'
		else if (isParameterToken(v) && isWildcardParameter(v as Parameter)) label = `\${wildcard('${(v as Parameter).key}')}`
		else label = `\${${(v as Parameter).key}}`
		return acc + label + str
	}, '')
}

function validatePattern(strings: TemplateStringsArray, values: readonly RouteParameter[]): Error[] {
	const errors: Error[] = []
	const pattern = reconstructPattern(strings, values)
	const startsWithRoute = values.length > 0 && isRoute(values[0]) && strings[0] === ''

	if (!startsWithRoute && !strings[0]!.startsWith('/'))
		errors.push(new Error(`route pattern must start with a slash: "${pattern}"`))

	if (!strings[strings.length - 1]!.endsWith('/'))
		errors.push(new Error(`route pattern must end with a slash: "${pattern}"`))

	for (let i = 0; i < values.length; i++) {
		const v = values[i]!
		if (isRoute(v)) {
			if (i !== 0)
				errors.push(new Error(`Route interpolation must be at the start of the pattern: "${pattern}"`))
			if (strings[0] !== '')
				errors.push(new Error(`Route interpolation must have no preceding text — use route\`\${ParentRoute}/...\`: "${pattern}"`))
			if (!strings[1]?.startsWith('/'))
				errors.push(new Error(`Route interpolation must be followed by a slash: "${pattern}"`))
		}
		if (isParameterToken(v) && isWildcardParameter(v as Parameter)) {
			if (i !== values.length - 1)
				errors.push(new Error(`Wildcard interpolation must be at the end of the pattern: "${pattern}"`))
			if (!strings[i]!.endsWith('/'))
				errors.push(new Error(`Wildcard interpolation must be preceded by a slash: "${pattern}"`))
		}
	}

	return errors
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

export function route<const T extends RouteParameter[]>(
	strings: TemplateStringsArray, ...values: T
): RouteBuilder<T> {

	const errors = validatePattern(strings, values)
	dev.logRouteErrors?.(errors)

	if (errors.length > 0) {
		return (({ resolve }) => ({
			[routeBrand]: true,
			[errorBrand]: true,
			[tokenTypes]: [] as unknown as FilterOutParent<T>,
			[parentType]: undefined as never,
			[routePartsBrand]: [],
			resolve,
			hasParameterTokens: false,
			hasWildcard: false,
			match: async () => ({ success: false }),
		})) as RouteBuilder<T>
	}

	const parent = values.length > 0 && isRoute(values[0]) ? values[0] : undefined
	const routeParts = zipTemplateParts(strings, values)

	return (({ resolve }) => {

		// TODO now we validate the parent route in the router and here, is there a smart caching solution?

		const lastValue = values.at(-1)
		const hasWildcard = !!lastValue && isWildcardParameter(lastValue as Parameter)
		const match = routeMatcher<T>(routeParts)

		return {

			[routeBrand]: true,

			[tokenTypes]: values.filter(value => !isParameterToken(value)) as FilterOutParent<T>,
			[parentType]: parent as T extends { parent: infer P extends Route<any> } ? P : never,

			[routePartsBrand]: routeParts,

			resolve,

			hasParameterTokens: values.length > 0,
			hasWildcard,

			match
		}
	}) as RouteBuilder<T>
}