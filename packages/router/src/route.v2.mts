import type { create } from '@rooted/components/elements'
import { isParameterToken, isWildcardParameter, type Parameter, type ParameterToValueType, type RouteParameter, token, wildcard } from './route.tokens.v2.mts'
import { type MatchRouteOptions, type RouteMatch, routeMatcher } from './route.match.v2.mts'
import { dev } from './dev-helper.v2.mts'
import { routeMetaData, type RouteMetadata, isRoute } from './route.metadata.v2.mts'

export { isRoute }

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
		? Required<ConvertPathParameters<TRoute[typeof routeMetaData]['tokenTypes']>>
		: [TRoute[typeof routeMetaData]['parentType']] extends [never]
			? Required<ConvertPathParameters<TRoute[typeof routeMetaData]['tokenTypes']>>
			: TRoute[typeof routeMetaData]['parentType'] extends Route<any>
				? Required<ConvertPathParameters<TRoute[typeof routeMetaData]['tokenTypes']>> & RouteParameterDictionary<TRoute[typeof routeMetaData]['parentType'], RecursionCounter[D]>
				: Required<ConvertPathParameters<TRoute[typeof routeMetaData]['tokenTypes']>>

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
	}>
	: Route<{
		parameters: FilterOutParent<T>,
		parent: ExtractParent<T>
	}>

export type RouteParameters<T extends Parameter[]> = {
	parameters: FilterOutParent<T>,
	parent?: ExtractParent<T> | any
}

export type Route<T extends RouteParameters<Parameter[]>> = {
	/** Internal metadata bag. */
	readonly [routeMetaData]: RouteMetadata<T>
	/** Resolves the component to render when this route is the best match. */
	readonly resolve: RouteResolver<T['parameters']>
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
	if (errors.length > 0) return errorRoute<T>()

	const parent = values.length > 0 && isRoute(values[0]) ? values[0] : undefined
	const routeParts = zipTemplateParts(strings, values)

	return (({ resolve }) => {

		const lastValue = values.at(-1)
		const hasWildcard = !!lastValue && isWildcardParameter(lastValue as Parameter)
		const match = routeMatcher<T>(routeParts)

		return {
			[routeMetaData]: {
				tokenTypes: values.filter(value => !isParameterToken(value)) as FilterOutParent<T>,
				parentType: parent as T extends { parent: infer P extends Route<any> } ? P : never,
				hasParameterTokens: values.length > 0,
				hasWildcard,
				routeParts,
			} satisfies RouteMetadata<any>,
			resolve,
			match
		}
	}) as RouteBuilder<T>
}

const errorRoute_ = (({ resolve }: { resolve: RouteResolver<any>} ) => ({
	[routeMetaData]: {
		tokenTypes: [] as unknown as FilterOutParent<any>,
		parentType: undefined as never,
		hasParameterTokens: false,
		hasWildcard: false,
		hasErrors: true,
		routeParts: [],
	} satisfies RouteMetadata<any>,
	resolve,
	match: async () => ({ success: false }),
})) as unknown as RouteBuilder<any>

function errorRoute<const T extends RouteParameter[]>(): RouteBuilder<T> {
	return errorRoute_ as RouteBuilder<T>
}
