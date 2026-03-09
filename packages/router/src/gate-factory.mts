import { component } from '@rooted/components'
import type { Component, GenericComponent } from '@rooted/components'
import { dev } from './dev-helper.mts'

export const typedParameter: unique symbol = Symbol.for('rooted:typed-parameter')

/** Internal brand that distinguishes a {@link WildcardParameter} from a {@link PathParameter}. */
const wildcardBrand: unique symbol = Symbol.for('rooted:wildcard')

type WildcardParameter<K extends string = string> = {
	readonly key: K
	readonly [wildcardBrand]: true
}

/**
 * Declares a catch-all path parameter for use inside a {@link gate} template string.
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
 * import { gate, wildcard } from '@rooted/router'
 *
 * export const ArchiveGate = gate`/archive/${wildcard('slug')}/`(Archive)
 * // options.gate.slug is typed as string
 * ```
 *
 * @example Default key (`'path'`)
 * ```ts
 * export const ArchiveGate = gate`/archive/${wildcard()}/`(Archive)
 * // options.gate.path is typed as string
 * ```
 *
 * @see {@link gate}
 * @see {@link GateParameters}
 */
export function wildcard<K extends string = 'path'>(key = 'path' as K): WildcardParameter<K> {
	return { key, [wildcardBrand]: true } as WildcardParameter<K>
}

/** Returns `true` if `v` is a {@link WildcardParameter}. */
function isWildcardParam(v: unknown): v is WildcardParameter {
	return typeof v === 'object' && v !== null && wildcardBrand in (v as object)
}

/**
 * Declares a typed path parameter for use inside a {@link gate} template string.
 *
 * The matched URL segment is automatically coerced to the specified `type` and
 * passed to the component via `options.gate[key]`. If coercion fails the gate
 * does not render (treated as no-match).
 *
 * @param key  - Property name on `options.gate` that will hold the parsed value.
 * @param matches - Constructor representing the target type. One of `Number`,
 *   `String`, `Boolean`, or `Date`.
 *
 * @example
 * ```ts
 * import { gate, token } from '@rooted/router'
 *
 * export const ArticleGate = gate`/articles/${token('id', Number)}/`(Article)
 * //                                                  ^^^^^^^^^^
 * // options.gate.id will be a number
 * ```
 *
 * @see {@link gate}
 * @see {@link GateParameters}
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

/** Any value that may appear as an interpolation in a gate template string. */
type GateValue = PathParameter | BoundGateDefinition<any, any> | WildcardParameter

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

// Extract PathParameter and WildcardParameter entries from a GateValue tuple
type ExtractParams<T extends readonly GateValue[]> =
	T extends readonly [infer H, ...infer R extends readonly GateValue[]]
		? H extends PathParameter | WildcardParameter
			? [H, ...ExtractParams<R>]
			: ExtractParams<R>
		: []

/**
 * Extracts the typed parameter object from a {@link BoundGateDefinition}.
 *
 * Use this as the `gate` property in your component's options type so TypeScript
 * knows the exact shape of the URL parameters.
 *
 * @example
 * ```ts
 * import { type GateParameters } from '@rooted/router'
 * import { type ArticleGate } from './_gates.mts'
 *
 * export type ArticleOptions = {
 *   gate: GateParameters<typeof ArticleGate>
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

export type GateParameters<G> = G extends { [typedParameter]: infer T extends AnyParam[] }
	? { [P in T[number] as P['key']]: P extends WildcardParameter ? string : ParameterValueType<(P & PathParameter)['matches']> }
	: never

/**
 * Removes the `gate` property from a component options type.
 *
 * Gates inject `gate` automatically; consumers of the component should not
 * have to supply it from the outside. This utility keeps the external-facing
 * options type clean.
 *
 * @internal Primarily used by the router internals and gate binding logic.
 */
export type OmitGate<O> = O extends never ? never : Omit<O, 'gate'>

/**
 * The result of calling {@link gate} or {@link junction}. A bound gate is a
 * component enriched with routing metadata: the URL pattern, typed parameters,
 * and whether a child route is required.
 *
 * Bound gates are self-managing — they listen to `popstate` events and show or
 * hide their component based on whether the current URL matches the pattern.
 *
 * You typically do not construct this type manually; it is returned by {@link gate}
 * or {@link junction}.
 */
export type BoundGateDefinition<O extends {}, T extends AnyParam[]> = Component<OmitGate<O>> & {
	/** The typed path parameter descriptors that were declared with {@link token}. */
	readonly [typedParameter]: T
	/**
	 * When `true`, the gate only renders when the path has **additional segments**
	 * beyond its own pattern. The gate's own path returns 404.
	 *
	 * Set by using {@link junction} instead of {@link gate}.
	 */
	readonly exact: boolean
	/**
	 * `true` after another gate has been defined with this gate as its parent
	 * interpolation, meaning this gate has registered child routes.
	 */
	readonly hasChildren: boolean
	/**
	 * Tests whether `path` matches this gate's pattern starting at `offset`.
	 *
	 * @param path   - The pathname to test (e.g. `location.pathname`).
	 * @param offset - Character offset to start matching from. Defaults to `0`.
	 * @returns A `MatchResult` with the end position and parsed params, or `false`.
	 */
	matchFrom(path: string, offset?: number): MatchResult | false
	/**
	 * Tests whether `url` matches this gate's pattern.
	 *
	 * @param url - The URL to test.
	 * @returns The parsed params record, or `false` if there is no match.
	 */
	match(url: URL): Record<string, unknown> | false
}

type UnboundGateDefinition = {
	matchFrom(path: string, offset?: number): MatchResult | false
	match(url: URL): Record<string, unknown> | false
}

/** The curried binder returned by {@link gate} and {@link junction}. */
type GateBinder<T extends readonly GateValue[]> = <O extends {}>(inner: Component<O>) => BoundGateDefinition<O, ExtractParams<T>>

// Tracks which gates have had child gates defined against them
const gatesWithChildren = new WeakSet<object>()

/** Returns `true` if `v` is a {@link BoundGateDefinition}. */
function isGateDefinition(v: unknown): v is BoundGateDefinition<any, any> {
	return typeof v === 'object' && v !== null && typedParameter in v
}

/**
 * Binds a URL pattern to a component, producing a {@link BoundGateDefinition}.
 *
 * `gate` is a tagged-template function. Write the URL pattern as a template
 * string; use {@link token} interpolations for typed parameters, a parent
 * {@link BoundGateDefinition} as the first interpolation to create a child
 * route, and {@link wildcard} as the last interpolation for catch-all matching.
 *
 * Gates are **self-managing**: once mounted inside a {@link router}, each gate
 * listens to `popstate` events and shows or removes its component whenever the
 * URL matches (or stops matching) its pattern.
 *
 * @returns A binder function that accepts the component to render.
 *
 * @example Basic gate
 * ```ts
 * import { gate, token } from '@rooted/router'
 * import { Article } from './article.mts'
 *
 * export const ArticleGate = gate`/articles/${token('id', Number)}/`(Article)
 * ```
 *
 * @example Child route (parent interpolation)
 * ```ts
 * export const CommentsGate = gate`${ArticleGate}/comments/`(Comments)
 * ```
 *
 * @example Catch-all (wildcard)
 * ```ts
 * export const ArchiveGate = gate`/archive/${wildcard}/`(Archive)
 * ```
 *
 * @see {@link junction}
 * @see {@link token}
 * @see {@link wildcard}
 * @see {@link router}
 * @see {@link GateParameters}
 */
export function gate<const T extends readonly GateValue[]>(
	strings: TemplateStringsArray, ...values: T
): GateBinder<T> {
	dev.validatePattern?.(strings, values as unknown as GateValue[], false)
	const parentGate = isGateDefinition(values[0]) ? values[0] as BoundGateDefinition<any, any> : undefined
	if (parentGate) gatesWithChildren.add(parentGate)
	const pathValues = values.filter(v => !isGateDefinition(v)) as AnyParam[]
	// When a parent gate is the first interpolation, strings[0] is '' (nothing before the parent).
	// Slice it off so the remaining strings align with the filtered pathValues.
	const childStrings = parentGate ? strings.slice(1) as unknown as TemplateStringsArray : strings
	const unbound = buildGate(childStrings, pathValues, parentGate as unknown as UnboundGateDefinition | undefined)
	return (<O extends {}>(inner: Component<O>) =>
		bindComponentToGate(inner, unbound, false)) as GateBinder<T>
}

/**
 * Defines a **junction** — a gate that renders its component only when a child
 * route is also active. Navigating directly to the junction's own path falls
 * through to `notFound`.
 *
 * Use `junction` when the route is a layout or navigation point that exists
 * solely to unlock child routes.
 *
 * @returns A binder function that accepts the component to render.
 *
 * @example
 * ```ts
 * import { gate, junction, token } from '@rooted/router'
 *
 * // Renders Article only when a child route is active
 * export const ArticleGate  = junction`/articles/${token('id', Number)}/`(Article)
 * // Renders at /articles/123/comments/
 * export const CommentsGate = gate`${ArticleGate}/comments/`(Comments)
 * ```
 *
 * @see {@link gate}
 * @see {@link router}
 */
export function junction<const T extends readonly PathParameter[]>(
	strings: TemplateStringsArray, ...values: T
): GateBinder<T> {
	dev.validatePattern?.(strings, values as unknown as GateValue[], true)
	const unbound = buildGate(strings, values as unknown as AnyParam[])
	return (<O extends {}>(inner: Component<O>) =>
		bindComponentToGate(inner, unbound, true)) as GateBinder<T>
}

function bindComponentToGate<O extends {}>(inner: Component<O>, gateDef: UnboundGateDefinition, exact: boolean): BoundGateDefinition<O, PathParameter[]> {
	const bound = component<OmitGate<O>>({
		name: inner.name + '-gate',
		onMount(ctx) {
			const { append, signal } = ctx
			const options = (ctx as any).options as OmitGate<O> | undefined
			let el: GenericComponent | null = null

			const update = () => {
				const result = gateDef.matchFrom(location.pathname)
				const renders = result && (!exact || result.end < location.pathname.length)

				dev.verifyExactWillResolve?.(inner.name, exact, result, renders)

				if (renders) {
					if (!el) el = append(inner, { ...options, gate: result.params } as unknown as O)
				} else {
					el?.remove()
					el = null
				}
			}

			window.addEventListener('popstate', update, { signal })
			update()
		}
	}) as unknown as Writeable<BoundGateDefinition<O, PathParameter[]>>

	bound[typedParameter] = (gateDef as any)[typedParameter]
	bound.exact = exact
	bound.matchFrom = gateDef.matchFrom.bind(gateDef)
	bound.match = gateDef.match.bind(gateDef)

	Object.defineProperty(bound, 'hasChildren', {
		get: () => gatesWithChildren.has(bound),
		enumerable: true,
		configurable: false,
	})

	return Object.freeze(bound) as BoundGateDefinition<O, PathParameter[]>
}

function buildGate(strings: TemplateStringsArray, values: AnyParam[], parent?: UnboundGateDefinition): UnboundGateDefinition {

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

	const gateDef: Writeable<UnboundGateDefinition> & { [typedParameter]: AnyParam[] } = {
		[typedParameter]: values,
		matchFrom: ownMatchFrom,
		match: (url: URL) => {
			const result = ownMatchFrom(url.pathname)
			return result === false ? false : result.params
		},
	}

	return Object.freeze(gateDef)
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
