// TODO rename to route-factory and split gate functionality into a separate file.
// Also rename options.gate to options.path for both routes and gates.
// Then fix the readme and docs, apart from ADRs, junction is no longer a concept.

import { component } from '@rooted/components'
import type { Component, GenericComponent } from '@rooted/components'
import { dev } from './dev-helper.mts'

export const typedParameter: unique symbol = Symbol.for('rooted:typed-parameter')

/** Internal brand that identifies a {@link RouteDefinition}. */
export const routeBrand: unique symbol = Symbol.for('rooted:route')

/** Internal brand that distinguishes a {@link WildcardParameter} from a {@link PathParameter}. */
const wildcardBrand: unique symbol = Symbol.for('rooted:wildcard')

type WildcardParameter<K extends string = string> = {
	readonly key: K
	readonly [wildcardBrand]: true
}

/**
 * Declares a catch-all path parameter for use inside a {@link route} template string.
 *
 * A `wildcard` matches one or more remaining path segments and exposes the
 * matched value on `options.gate[key]` as a `string`. It must be the last
 * interpolation in the pattern, and must be preceded by a `/`.
 *
 * @param key - Property name on `options.gate` that will hold the matched path string.
 *   Defaults to `'path'` when omitted.
 *
 * @example Explicit key
 * ```ts
 * import { route, wildcard } from '@rooted/router'
 *
 * export const ArchiveRoute = route`/archive/${wildcard('slug')}/`(Archive)
 * // options.gate.slug is typed as string
 * ```
 *
 * @example Default key (`'path'`)
 * ```ts
 * export const ArchiveRoute = route`/archive/${wildcard()}/`(Archive)
 * // options.gate.path is typed as string
 * ```
 *
 * @see {@link route}
 * @see {@link RouteParameters}
 */
export function wildcard<K extends string = 'path'>(key = 'path' as K): WildcardParameter<K> {
	return { key, [wildcardBrand]: true } as WildcardParameter<K>
}

/** Returns `true` if `v` is a {@link WildcardParameter}. */
function isWildcardParam(v: unknown): v is WildcardParameter {
	return typeof v === 'object' && v !== null && wildcardBrand in (v as object)
}

/**
 * Declares a typed path parameter for use inside a {@link route} template string.
 *
 * The matched URL segment is automatically coerced to the specified `type` and
 * passed to the component via `options.gate[key]`. If coercion fails the route
 * does not render (treated as no-match).
 *
 * @param key  - Property name on `options.gate` that will hold the parsed value.
 * @param matches - Constructor representing the target type. One of `Number`,
 *   `String`, `Boolean`, or `Date`.
 *
 * @example
 * ```ts
 * import { route, token } from '@rooted/router'
 *
 * export const ArticleRoute = route`/articles/${token('id', Number)}/`(Article)
 * //                                                   ^^^^^^^^^^
 * // options.gate.id will be a number
 * ```
 *
 * @see {@link route}
 * @see {@link RouteParameters}
 */
export function token<K extends string, V extends ParameterValue>(key: K, matches: V) {
	return { key, matches } as PathParameter<K, V>
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] }

type ParameterValue =
	| NumberConstructor
	| StringConstructor
	| BooleanConstructor
	| DateConstructor

type PathParameter<K extends string = string, V extends ParameterValue = ParameterValue> = {
	key: K
	matches: V
}

/** Any value that may appear as an interpolation in a route template string. */
type RouteValue = PathParameter | RouteDefinition<any, any> | WildcardParameter

type MatchResult = {
	end: number
	params: Record<string, unknown>
}

type ParameterValueType<V extends ParameterValue> =
	V extends NumberConstructor ? number :
	V extends StringConstructor ? string :
	V extends BooleanConstructor ? boolean :
	V extends DateConstructor ? Date :
	never

// Extract PathParameter and WildcardParameter entries from a RouteValue tuple
type ExtractParams<T extends readonly RouteValue[]> =
	T extends readonly [infer H, ...infer R extends readonly RouteValue[]]
	? H extends PathParameter | WildcardParameter
	? [H, ...ExtractParams<R>]
	: ExtractParams<R>
	: []

type ConvertPathParams<T extends readonly PathParameter<any, any>[]> = {
	[P in T[number]as P['key']]: ParameterValueType<P['matches']>
}

type PathParameterDictionary<T extends AnyParam[]> = ConvertPathParams<ExtractParams<T>>

/**
 * Extracts the typed parameter object from a {@link RouteDefinition} or {@link BoundGateDefinition}.
 *
 * Use this as the `gate` property in your component's options type so TypeScript
 * knows the exact shape of the URL parameters.
 *
 * @example
 * ```ts
 * import { type GateParameters } from '@rooted/router'
 * import { type ArticleRoute } from './_routes.mts'
 *
 * export type ArticleOptions = {
 *   gate: GateParameters<typeof ArticleRoute>
 * }
 *
 * export const Article = component<ArticleOptions>({
 *   name: 'article',
 *   onMount({ options }) {
 *     console.log(options.gate.id) // typed as `number`
 *   }
 * })
 * ```
 */
type AnyParam = PathParameter | WildcardParameter

export type RouteParameters<G> = G extends { [typedParameter]: infer T extends AnyParam[] }
	? { [P in T[number]as P['key']]: P extends WildcardParameter ? string : P extends PathParameter ? ParameterValueType<P['matches']> : never }
	: never

/**
 * Removes the `gate` property from a component options type.
 *
 * Routes inject `gate` automatically; consumers of the component should not
 * have to supply it from the outside. This utility keeps the external-facing
 * options type clean.
 *
 * @internal Primarily used by the router internals and route binding logic.
 */
export type OmitGate<O> = O extends never ? never : Omit<O, 'gate'>

/**
 * A route definition produced by {@link route}.
 *
 * A `RouteDefinition` is a descriptor — it holds the URL pattern, typed parameters,
 * and a reference to the destination component. It is **not** a self-managing component.
 * The {@link router} coordinates mounting and unmounting route components using
 * best-match selection.
 *
 * You typically do not construct this type manually; it is returned by {@link route}.
 */
export type RouteDefinition<O extends {}, T extends AnyParam[]> = {
	/** The destination component rendered when this route is the best match. */
	readonly component: Component<O>
	/** The typed path parameter descriptors declared with {@link token}. */
	readonly [typedParameter]: T
	/** Brand that identifies this object as a {@link RouteDefinition}. */
	readonly [routeBrand]: true
	/** `true` if this route's pattern ends with a {@link wildcard} parameter. */
	readonly hasWildcard: boolean
	/**
	 * Tests whether `path` matches this route's URL pattern, ignoring any filter.
	 * Used by the router to detect filter-rejected matches and suppress parent fallbacks.
	 */
	patternMatchFrom(path: string, offset?: number): MatchResult | false
	/**
	 * Tests whether `path` matches this route's pattern starting at `offset`.
	 *
	 * @param path   - The pathname to test (e.g. `location.pathname`).
	 * @param offset - Character offset to start matching from. Defaults to `0`.
	 * @returns A `MatchResult` with the end position and parsed params, or `false`.
	 */
	matchFrom(path: string, offset?: number): MatchResult | false
	/**
	 * Tests whether `url` matches this route's pattern.
	 *
	 * @param url - The URL to test.
	 * @returns The parsed params record, or `false` if there is no match.
	 */
	match(url: URL | Location): Record<string, unknown> | false

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
	 * 	href: CategoryRoute.link(category), // actually `CategoryRoute.link({ slug: category.slug })` but the shape fits so the shorthand is preferred
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
	link(parameters: PathParameterDictionary<T>): string
}

/**
 * The result of calling {@link gate}. A bound gate is a self-managing component
 * that listens to `popstate` events and shows or hides its component based on
 * whether the current URL matches the subscribed route's pattern.
 *
 * Use bound gates to embed conditional sub-content inside a route component
 * via `append(gate, {})`.
 *
 * You typically do not construct this type manually; it is returned by {@link gate}.
 */
export type BoundGateDefinition<O extends {}, T extends AnyParam[]> = Component<OmitGate<O>> & {
	/** The typed path parameter descriptors from the subscribed route. */
	readonly [typedParameter]: T
	/**
	 * Tests whether `path` matches the subscribed route's pattern starting at `offset`.
	 */
	matchFrom(path: string, offset?: number): MatchResult | false
	/**
	 * Tests whether `url` matches the subscribed route's pattern.
	 */
	match(url: URL): Record<string, unknown> | false
}

type UnboundRouteDefinition = {
	readonly hasWildcard: boolean
	patternMatchFrom(path: string, offset?: number): MatchResult | false
	matchFrom(path: string, offset?: number): MatchResult | false
	match(url: URL | Location): Record<string, unknown> | false
}

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
export type RouteFilter<T extends readonly RouteValue[]> = (params: RouteParameters<{ readonly [typedParameter]: ExtractParams<T> }>) => boolean

/** The curried binder returned by {@link route}. */
type RouteBinder<T extends readonly RouteValue[]> = <O extends {}>(inner: Component<O>, filter?: RouteFilter<T>) => RouteDefinition<O, ExtractParams<T>>

/** Returns `true` if `v` is a {@link RouteDefinition}. */
export function isRouteDefinition(v: unknown): v is RouteDefinition<any, any> {
	return typeof v === 'object' && v !== null && routeBrand in (v as object)
}

/**
 * Defines a route — a URL pattern bound to a destination component.
 *
 * `route` is a tagged-template function. Write the URL pattern as a template
 * string; use {@link token} interpolations for typed parameters, a parent
 * {@link RouteDefinition} as the first interpolation to compose URL paths,
 * and {@link wildcard} as the last interpolation for catch-all matching.
 *
 * A `RouteDefinition` serves two purposes:
 *
 * 1. **Router registration** — the {@link router} evaluates all registered routes
 *    on each navigation and renders only the best match (the route whose pattern
 *    covers the most characters of the current URL).
 *
 * 2. **Gate binding** — pass the route to {@link gate} to create a self-managing
 *    sub-component that shows its component whenever the route matches the current
 *    URL, regardless of which route the router has selected as the best match.
 *
 * Routes are **not** self-managing components — they are descriptors consumed by
 * the router and by gates.
 *
 * @returns A binder function that accepts the destination component and an
 *   optional {@link RouteFilter} to render.
 *
 * @example Basic route
 * ```ts
 * import { route, token } from '@rooted/router'
 * import { Article } from './article.mts'
 *
 * export const ArticleRoute = route`/articles/${token('id', Number)}/`(Article)
 * ```
 *
 * @example Route with a filter (returns `false` → notFound, no parent fallback)
 * ```ts
 * export const ArticleRoute = route`/articles/${token('id', Number)}/`(
 *   Article,
 *   ({ id }) => articles.some(a => a.id === id),
 * )
 * ```
 *
 * @example Child route (parent interpolation for URL composition)
 * ```ts
 * export const CommentsRoute = route`${ArticleRoute}/comments/`(Comments)
 * ```
 *
 * @example Catch-all (wildcard)
 * ```ts
 * export const ArchiveRoute = route`/archive/${wildcard}/`(Archive)
 * ```
 *
 * @see {@link gate}
 * @see {@link token}
 * @see {@link wildcard}
 * @see {@link router}
 * @see {@link RouteFilter}
 * @see {@link RouteParameters}
 */
export function route<const T extends readonly RouteValue[]>(
	strings: TemplateStringsArray, ...values: T
): RouteBinder<T> {
	dev.validatePattern?.(strings, values as unknown as RouteValue[])
	const parentRoute = isRouteDefinition(values[0]) ? values[0] as RouteDefinition<any, any> : undefined
	const pathValues = values.filter(v => !isRouteDefinition(v)) as AnyParam[]
	// When a parent route is the first interpolation, strings[0] is '' (nothing before the parent).
	// Slice it off so the remaining strings align with the filtered pathValues.
	const childStrings = parentRoute ? strings.slice(1) as unknown as TemplateStringsArray : strings
	const unbound = buildRoute(childStrings, pathValues, parentRoute as unknown as UnboundRouteDefinition | undefined)

	return (<O extends {}>(inner: Component<O>, filter?: RouteFilter<T>) => {
		const matchFrom = filter
			? (path: string, offset?: number) => {
				const result = unbound.matchFrom(path, offset)
				if (!result) return false
				return filter(result.params as any) ? result : false
			}
			: unbound.matchFrom.bind(unbound)
		const match = filter
			? (url: URL | Location) => {
				const result = unbound.match(url)
				if (result === false) return false
				return filter(result as any) ? result : false
			}
			: unbound.match.bind(unbound)
		const routeDef: Writeable<RouteDefinition<O, AnyParam[]>> & { [typedParameter]: AnyParam[], [routeBrand]: true } = {
			component: inner,
			[typedParameter]: (unbound as any)[typedParameter],
			[routeBrand]: true,
			hasWildcard: unbound.hasWildcard,
			patternMatchFrom: unbound.matchFrom.bind(unbound),
			matchFrom,
			match,
			link(parameters) {
				// TODO join all static parts into an array in the route function scope, then zip the required parameters by name to construct a correct url
				// This includes the parent.
				console.log(strings, values, parameters)
				return ''
			}
		}
		return Object.freeze(routeDef) as RouteDefinition<O, AnyParam[]>
	}) as RouteBinder<T>
}

/**
 * Subscribes a component to a route, producing a {@link BoundGateDefinition}.
 *
 * When appended inside a shell component, a gate mounts its component as soon
 * as the subscribed route's URL pattern matches the current URL, and unmounts
 * it when the URL no longer matches. URL parameters parsed from the match are
 * injected automatically as `options.gate`. If the parameters change without
 * leaving the route (e.g. navigating from one article to another), the
 * component is re-mounted with the updated values.
 *
 * A gate activates based solely on its own URL match — it is unaffected by
 * which route the router considers the best match. This is what makes gates the
 * composition mechanism for shell components: a shell bound to multiple child
 * routes uses `append(gate, {})` calls to show the correct sub-content at each
 * URL depth.
 *
 * @param routeRef - The route whose URL pattern drives this gate's visibility.
 * @param inner    - The component to show when the route matches.
 * @returns A self-managing {@link BoundGateDefinition} component.
 *
 * @example
 * ```ts
 * import { route, gate, token } from '@rooted/router'
 * import { Categories } from './categories.mts'
 * import { Category } from './category.mts'
 *
 * // Child route binds to the shell component; gate binds to the content component
 * export const CategoryRoute = route`${CategoriesRoute}/${token('slug', String)}/`(Categories)
 * export const CategoryGate  = gate(CategoryRoute, Category)
 *
 * // Inside the Categories shell component:
 * append(CategoryGate)  // mounts Category at /categories/:slug/, unmounts otherwise
 * ```
 *
 * @see {@link route}
 * @see {@link router}
 * @see {@link RouteParameters}
 */
export function gate<O extends {}>(
	routeRef: RouteDefinition<O, AnyParam[]>,
	inner: Component<O>,
): BoundGateDefinition<O, AnyParam[]> {
	const bound = component<OmitGate<O>>({
		name: inner.name + '-gate',
		onMount(ctx) {
			const { append, create, signal } = ctx
			const options = (ctx as any).options as OmitGate<O> | undefined
			let el: GenericComponent | null = null
			let lastParams: string | undefined

			const update = () => {
				const result = routeRef.matchFrom(location.pathname)

				if (result) {
					const serialized = JSON.stringify(result.params)
					if (!el || lastParams !== serialized) {
						el?.remove()
						el = append(create(inner, { ...options, gate: result.params } as unknown as O))
						lastParams = serialized
					}
				} else {
					el?.remove()
					el = null
					lastParams = undefined
				}
			}

			window.addEventListener('popstate', update, { signal })
			update()
		}
	}) as unknown as Writeable<BoundGateDefinition<O, AnyParam[]>>

	bound[typedParameter] = routeRef[typedParameter]
	bound.matchFrom = routeRef.matchFrom.bind(routeRef)
	bound.match = routeRef.match.bind(routeRef)

	return Object.freeze(bound) as BoundGateDefinition<O, AnyParam[]>
}

function buildRoute(strings: TemplateStringsArray, values: AnyParam[], parent?: UnboundRouteDefinition): UnboundRouteDefinition {

	function matchFrom(path: string, offset: number = 0): MatchResult | false {
		let pos = offset
		const params: Record<string, unknown> = {}

		for (let i = 0; i < strings.length; i++) {
			const staticPart = strings[i]!

			if (!path.startsWith(staticPart, pos)) return false
			pos += staticPart.length

			if (i < values.length) {
				const param = values[i]!

				if (isWildcardParam(param)) {
					// Wildcard: match everything remaining (at least 1 character)
					if (pos >= path.length) return false
					params[param.key] = path.slice(pos)
					return { end: path.length, params }
				}

				const nextStatic = strings[i + 1]!
				const end = nextStatic.length > 0
					? path.indexOf(nextStatic, pos)
					: path.length
				if (end === -1) return false

				const segment = path.slice(pos, end)
				if (segment.length === 0) return false

				const parsed = parseParam(segment, (param as PathParameter).matches)
				if (parsed instanceof Error) return false

				params[(param as PathParameter).key] = parsed
				pos = end
			}
		}

		return { end: pos, params }
	}

	function ownMatchFrom(path: string, offset: number = 0): MatchResult | false {
		if (parent) {
			const parentResult = parent.matchFrom(path, offset)
			if (!parentResult) return false
			const childOffset = path[parentResult.end - 1] === '/' && strings[0]?.startsWith('/')
				? parentResult.end - 1
				: parentResult.end
			const ownResult = matchFrom(path, childOffset)
			if (!ownResult) return false
			return { end: ownResult.end, params: { ...parentResult.params, ...ownResult.params } }
		}
		return matchFrom(path, offset)
	}

	const routeDef: Writeable<UnboundRouteDefinition> & { [typedParameter]: AnyParam[] } = {
		[typedParameter]: values,
		hasWildcard: values.some(isWildcardParam),
		patternMatchFrom: ownMatchFrom,
		matchFrom: ownMatchFrom,
		match: (url: URL | Location) => {
			const result = ownMatchFrom(url.pathname)
			return result === false ? false : result.params
		},
	}

	return Object.freeze(routeDef)
}

function parseParam(value: string, type: ParameterValue): unknown | Error {
	if (type === Number) {
		const n = +value
		if (Number.isNaN(n)) return new Error(`"${value}" is not a number`)
		return n
	}
	if (type === Boolean) {
		const lowerValue = value.toLowerCase()
		if (lowerValue === 'true' || lowerValue === 't' || value === '1') return true
		if (lowerValue === 'false' || lowerValue === 'f' || value === '0') return false
		return new Error(`"${value}" is not a boolean`)
	}
	if (type === Date) {
		try {
			const d = new Date(value)
			if (Number.isNaN(d.getTime())) return new Error(`"${value}" is not a valid date`)
			return d
		} catch (e) {
			return e instanceof Error ? e : new Error(String(e))
		}
	}
	if (type === String) {
		return value
	}

	return new Error('Custom parameter types are not yet implemented')
}
