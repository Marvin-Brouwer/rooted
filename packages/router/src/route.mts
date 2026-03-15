import type { create } from '@rooted/components/elements'
import { isParameterToken, isWildcardParameter, type Parameter, type ParameterToValueType, type RouteParameter, token, wildcard } from './route.tokens.mts'
import { type MatchRouteOptions, type RouteMatch, routeMatcher } from './route.match.mts'
import { dev } from './dev-helper.mts'
import { routeMetaData, type RouteMetadata, isRoute } from './route.metadata.mts'

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

/**
 * Extracts the complete typed parameter dictionary for a route, including parameters
 * inherited from any parent route (resolved recursively up to 10 levels deep).
 *
 * Use this as the type of the `parameters` argument when constructing links with
 * {@link href.for}.
 *
 * @example
 * ```ts
 * import { type RouteParameterDictionary } from '@rooted/router'
 *
 * type ArticleParams = RouteParameterDictionary<typeof ArticleRoute>
 * // { sectionSlug: string, id: number }
 * ```
 */
// Type hack to prevent infinite recursion
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
 * and prevents shorter parent routes from matching as a fallback (suppression).
 *
 * An `async` resolver enables bundle-splitting: the imported module is loaded
 * lazily on first navigation to the route.
 *
 * @see {@link route}
 */
export type RouteResolver<T extends readonly RouteParameter[]> =
	(context: { create: typeof create, tokens: PathParameterDictionary<T> }) =>
		Element | undefined | Promise<Element | undefined>

/**
 * Curried builder returned by {@link route}. Call it with `{ resolve }` to
 * produce a fully typed {@link Route}.
 */
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
	/** @internal Internal metadata bag — use {@link isRoute} to identify routes; do not access directly. */
	readonly [routeMetaData]: RouteMetadata<T>
	/**
	 * Resolves the element to render when this route is the best match.
	 *
	 * Returning `undefined` signals a non-match and prevents shorter parent routes
	 * from rendering as a fallback (suppression). The {@link router} calls this after
	 * a successful URL pattern match.
	 */
	readonly resolve: RouteResolver<T['parameters']>
	/**
	 * Tests whether this route's pattern matches a URL path.
	 *
	 * By default matches against the current `location`. Pass `options.target` to
	 * match against an explicit path string, {@link Path}, {@link Url}, `URL`, or
	 * `Location`. Set `options.checkInclusive` to `false` to allow prefix-only
	 * matching (the router uses this internally when evaluating parent routes).
	 *
	 * @returns A {@link RouteMatch} — check `match.success` before reading `match.tokens`.
	 *
	 * @see {@link MatchRouteOptions}
	 * @see {@link RouteMatch}
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
			if (strings[1] !== '' && !strings[1]?.startsWith('/'))
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

/**
 * Defines a route — a URL pattern bound to a component resolver.
 *
 * `route` is a tagged-template function. Write the URL pattern as a template
 * string and interpolate {@link token}s for typed parameters, a parent {@link Route}
 * as the first interpolation to compose URLs, and {@link wildcard} as the last
 * interpolation for catch-all segments. The pattern must start and end with `/`.
 *
 * Call the returned {@link RouteBuilder} with `{ resolve }` to complete the definition.
 * The `resolve` function receives `{ create, tokens }` and returns the `Element` to
 * render. Returning `undefined` signals a non-match and suppresses parent fallbacks.
 *
 * Invalid patterns (missing leading/trailing slash, wildcard not at the end, etc.) are
 * logged as warnings in development and produce a route that never matches.
 *
 * @returns A {@link RouteBuilder} — call it with `{ resolve }` to produce a {@link Route}.
 *
 * @example Basic route
 * ```ts
 * import { route } from '@rooted/router'
 *
 * export const HomeRoute = route`/`({
 *   resolve: ({ create }) => create(Home)
 * })
 * ```
 *
 * @example Route with typed parameters
 * ```ts
 * export const ArticleRoute = route`/articles/${token('id', Number)}/`({
 *   resolve: ({ create, tokens }) => create(Article, { id: tokens.id })
 * })
 * ```
 *
 * @example Child route (composes parent URL)
 * ```ts
 * export const CommentsRoute = route`${ArticleRoute}/comments/`({
 *   resolve: ({ create, tokens }) => create(Comments, { articleId: tokens.id })
 * })
 * ```
 *
 * @example Wildcard (catch-all)
 * ```ts
 * export const ArchiveRoute = route`/archive/${wildcard()}/`({
 *   resolve: ({ create, tokens }) => create(Archive, { slug: tokens.rest })
 * })
 * ```
 *
 * @example Async resolver (lazy-loaded bundle)
 * ```ts
 * export const HeavyRoute = route`/dashboard/`({
 *   resolve: async ({ create }) => {
 *     const { Dashboard } = await import('./dashboard.mts')
 *     return create(Dashboard)
 *   }
 * })
 * ```
 *
 * @see {@link token}
 * @see {@link wildcard}
 * @see {@link router}
 * @see {@link RouteResolver}
 */
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
