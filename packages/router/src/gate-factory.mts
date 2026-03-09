import { component } from '@rooted/components'
import type { Component, GenericComponent } from '@rooted/components'
import { dev } from './dev-helper.mts'

export const typedParameter: unique symbol = Symbol.for('rooted:typed-parameter')

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
 * export const ArticleGate = gate(Article)`/articles/${token('id', Number)}/`
 * //                                                             ^^^^^^^^^^
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
export type GateParameters<G> = G extends { [typedParameter]: infer T extends PathParameter[] }
	? { [P in T[number]as P['key']]: ParameterValueType<P['matches']> }
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
 * The result of calling {@link gate}. A bound gate is a component enriched with
 * routing metadata: the URL pattern, typed parameters, and child-route support.
 *
 * Bound gates are self-managing — they listen to `popstate` events and show or
 * hide their component based on whether the current URL matches the pattern.
 *
 * You typically do not construct this type manually; it is returned by {@link gate}.
 */
export type BoundGateDefinition<O extends {}, T extends PathParameter[]> = Component<OmitGate<O>> & {
	/** The typed path parameter descriptors that were declared with {@link token}. */
	readonly [typedParameter]: T
	/**
	 * When `true`, the gate only renders when the path has **additional segments**
	 * beyond its own pattern. The gate's own path returns 404.
	 *
	 * Set via {@link GateTag.exact}.
	 */
	readonly exact: boolean
	/**
	 * `true` after {@link BoundGateDefinition.append} has been called at least once,
	 * meaning this gate has registered child routes.
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
	/**
	 * Creates a child gate that matches this gate's pattern **plus** an additional
	 * path segment.
	 *
	 * The child gate is an independent {@link BoundGateDefinition} and must be
	 * registered in the {@link router} separately. It receives the parent's
	 * params merged with its own.
	 *
	 * @param component - The component to render for the child route.
	 * @returns A tagged-template function (the same API as {@link gate}) that
	 *   accepts the child path segment.
	 *
	 * @example
	 * ```ts
	 * export const ArticleGate  = gate(Article).exact`/articles/${token('id', Number)}/`
	 * export const CommentsGate = ArticleGate.append(Comments)`/comments/`
	 * // matches /articles/123/comments/
	 * ```
	 */
	append<O2 extends {}>(component: Component<O2>): (strings: TemplateStringsArray, ...values: PathParameter[]) => BoundGateDefinition<O2, PathParameter[]>
}

type UnboundGateDefinition = {
	matchFrom(path: string, offset?: number): MatchResult | false
	match(url: URL): Record<string, unknown> | false
	append(strings: TemplateStringsArray, ...values: PathParameter[]): UnboundGateDefinition
}

type GateTag<O extends {}> = {
	<T extends PathParameter[]>(strings: TemplateStringsArray, ...values: T): BoundGateDefinition<O, T>
	/**
	 * Creates an **exact** gate — the component only renders when the URL has
	 * additional path segments beyond the declared pattern.
	 *
	 * Use this when the gate is a layout that exists only to unlock child routes.
	 * Navigating directly to the gate's own URL will fall through to `notFound`.
	 *
	 * @example
	 * ```ts
	 * // Renders at /articles/123/anything — NOT at /articles/123/
	 * export const ArticleGate = gate(Article).exact`/articles/${token('id', Number)}/`
	 * ```
	 */
	exact: <T extends PathParameter[]>(strings: TemplateStringsArray, ...values: T) => BoundGateDefinition<O, T>
}

// Tracks which gates have had .append() called on them — used for the hasChildren property
const gatesWithChildren = new WeakSet<object>()

/**
 * Binds a component to a URL pattern, producing a {@link BoundGateDefinition}.
 *
 * The returned value is a tagged-template function. Write the URL pattern as a
 * template string; use {@link token} interpolations to declare typed parameters.
 *
 * Gates are **self-managing**: once mounted inside a {@link router}, each gate
 * listens to `popstate` events and shows or removes its component whenever the
 * URL matches (or stops matching) its pattern.
 *
 * @param inner - The component to render when the URL matches.
 * @returns A tagged-template function (and `.exact` variant) that accepts the
 *   URL pattern and returns a {@link BoundGateDefinition}.
 *
 * @example Basic gate
 * ```ts
 * import { gate, token } from '@rooted/router'
 * import { Article } from './article.mts'
 *
 * export const ArticleGate = gate(Article)`/articles/${token('id', Number)}/`
 * ```
 *
 * @example Exact gate (layout-only, requires child route)
 * ```ts
 * export const ArticleGate  = gate(Article).exact`/articles/${token('id', Number)}/`
 * export const CommentsGate = ArticleGate.append(Comments)`/comments/`
 * ```
 *
 * @see {@link token}
 * @see {@link router}
 * @see {@link GateParameters}
 */
export function gate<O extends {}>(inner: Component<O>): GateTag<O> {
	const fn = (<T extends PathParameter[]>(strings: TemplateStringsArray, ...values: T) =>
		bindComponentToGate(inner, buildGate(strings, values), false)) as GateTag<O>

	fn.exact = (<T extends PathParameter[]>(strings: TemplateStringsArray, ...values: T) =>
		bindComponentToGate(inner, buildGate(strings, values), true)) as GateTag<O>['exact']

	return fn
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
	bound.append = (<O2 extends {},>(subComponent: Component<O2>) =>
		(strings: TemplateStringsArray, ...values: PathParameter[]) => {
			gatesWithChildren.add(bound)
			return bindComponentToGate(subComponent, gateDef.append(strings, ...values), false)
		}) as BoundGateDefinition<O, PathParameter[]>['append']

	Object.defineProperty(bound, 'hasChildren', {
		get: () => gatesWithChildren.has(bound),
		enumerable: true,
		configurable: false,
	})

	return Object.freeze(bound) as BoundGateDefinition<O, PathParameter[]>
}

function buildGate(strings: TemplateStringsArray, values: PathParameter[], parent?: UnboundGateDefinition): UnboundGateDefinition {

	function matchFrom(path: string, offset: number = 0): MatchResult | false {
		let pos = offset
		const params: Record<string, unknown> = {}

		for (let i = 0; i < strings.length; i++) {
			const staticPart = strings[i]!

			if (!path.startsWith(staticPart, pos)) return false
			pos += staticPart.length

			if (i < values.length) {
				const param = values[i]!
				const nextStatic = strings[i + 1]!
				const end = nextStatic.length > 0
					? path.indexOf(nextStatic, pos)
					: path.length
				if (end === -1) return false

				const segment = path.slice(pos, end)
				if (segment.length === 0) return false

				const parsed = parseParam(segment, param.matches)
				if (parsed instanceof Error) return false

				params[param.key] = parsed
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

	const gateDef: Writeable<UnboundGateDefinition> & { [typedParameter]: PathParameter[] } = {
		[typedParameter]: values,
		matchFrom: ownMatchFrom,
		match: (url: URL) => {
			const result = ownMatchFrom(url.pathname)
			return result === false ? false : result.params
		},
		append: (strings: TemplateStringsArray, ...values: PathParameter[]) => buildGate(strings, values, gateDef),
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
