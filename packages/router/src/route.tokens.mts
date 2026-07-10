import { tupleResult, TupleResult } from '@rooted/util'

import { isRoute } from './route.metadata.mts'

import type { AnyRoute } from './route.mts'

/* eslint-disable @typescript-eslint/no-wrapper-object-types, @typescript-eslint/no-explicit-any */

/** The constructor types accepted as the `type` argument to {@link token}. */
export type ParameterType
	= NumberConstructor
	| StringConstructor
	| BooleanConstructor
	| DateConstructor
	| Wildcard

/** Internal brand that identifies a constant-values token's value list. Uses `Symbol.for` so it survives duplicate module instances (route manifests are loaded through jiti at build time). */
const constantBrand: unique symbol = Symbol.for('@rooted/constantParameterToken')

/**
 * The `type` of a constant-values token: the frozen list of allowed values.
 *
 * Created by calling {@link token} with an array instead of a constructor:
 * `token('locale', ['en-GB', 'nl-NL'])`. The token only matches values from
 * the list, and the matched value keeps its literal type.
 */
export type Constant<V extends string | number = string | number> = readonly V[] & { [constantBrand]: true }

export type ParameterTokenType
	= Number
	| String
	| Boolean
	| Date
	| Wildcard
	| Constant
	| AnyRoute

type ParameterToTokenType<V extends ParameterType>
	= V extends NumberConstructor ? number
	: V extends StringConstructor ? string
	: V extends BooleanConstructor ? boolean
	: V extends DateConstructor ? Date
	: V extends Wildcard ? Wildcard
	: V extends AnyRoute ? V
	: never

/** Maps a {@link ParameterTokenType} to the TypeScript value type it produces at runtime. */
// The Constant branch must come first: its literal unions would otherwise
// widen through the String or Number branches.
export type ParameterToValueType<V extends ParameterTokenType>
	= V extends Constant<infer U> ? U
	: V extends Number ? number
	: V extends String ? string
	: V extends Boolean ? boolean
	: V extends Date ? Date
	: V extends Wildcard ? string
	: never

export type TokenMatchResult<T extends ParameterTokenType = ParameterTokenType> = TupleResult<T>

/**
 * A typed path parameter descriptor produced by {@link token} or {@link wildcard}.
 *
 * Holds the parameter `key` (used as the property name in the tokens dictionary),
 * its `type` token, and a `match` function that parses and validates a raw URL
 * segment, returning a {@link TupleResult}.
 */
export type Parameter<K extends string = string, T extends ParameterTokenType = ParameterTokenType> = {
	key: K
	type: T

	match(parameter: string): TokenMatchResult<T>
	[tokenBrand]: true
}

export type RouteParameter = Parameter | AnyRoute

/**
 * Declares a typed path parameter for use inside a {@link route} template string.
 *
 * The matched URL segment is automatically coerced to the specified `type`. If
 * coercion fails (e.g. `"abc"` for `Number`), the route is treated as a non-match.
 *
 * Passing an array instead of a constructor creates a constant-values token:
 * it only matches the listed values, and the matched value keeps its literal
 * type. The array must hold values of one kind (all strings or all numbers).
 * Because the possible values are known, routes whose only dynamic parts are
 * constant tokens can be unrolled to concrete paths at build time (sitemap,
 * prerendering). See `RouteMetadata.staticPaths`.
 *
 * @param name - Property name in the `tokens` dictionary passed to `resolve`.
 * @param type - One of `Number`, `String`, `Boolean`, or `Date`, or an array of allowed values.
 *
 * @example
 * ```ts
 * import { route, token } from '@rooted/router'
 *
 * export const ArticleRoute = route`/articles/${token('id', Number)}/`({
 *   resolve: ({ create, tokens }) => create(Article, { id: tokens.id })
 * })
 * // tokens.id is typed as `number`
 * ```
 *
 * @example Constant values
 * ```ts
 * export const AboutRoute = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({
 *   resolve: ({ create, tokens }) => create(About, { locale: tokens.locale })
 * })
 * // tokens.locale is typed as `'en-GB' | 'nl-NL'`; /de-DE/about/ does not match
 * ```
 *
 * @see {@link wildcard}
 * @see {@link route}
 */
export function token<K extends string, const V extends readonly [string, ...string[]] | readonly [number, ...number[]]>(name: K, values: V): Parameter<K, Constant<V[number]>>
export function token<K extends string = string, T extends ParameterType = ParameterType>(name: K, type: T): Parameter<K, ParameterToTokenType<T>>
export function token(name: string, type: ParameterType | readonly (string | number)[]): Parameter {
	if (Array.isArray(type)) {
		const values = Object.freeze(Object.assign([...type] as (string | number)[], { [constantBrand]: true as const })) as Constant
		return {
			key: name,
			type: values,
			match: getConstantMatcher(values),
			[tokenBrand]: true,
		}
	}

	const match = getMatcher(type as ParameterType) as (value: string) => TokenMatchResult

	return {
		key: name,
		type: type as ParameterTokenType,
		match,
		[tokenBrand]: true,
	}
}

function getConstantMatcher(values: Constant) {
	return (value: string | number): TokenMatchResult<Constant> => {
		const found = values.find(allowed => String(allowed) === String(value))
		if (found === undefined) return tupleResult.error(new Error(`"${String(value)}" is not one of [${values.join(', ')}]`))
		return tupleResult.success(found as unknown as Constant)
	}
}

function getMatcher<T extends ParameterType>(type: T) {
	if (type === String) return (value: unknown): TokenMatchResult<String> => tupleResult.success(String(value))

	if (type === Boolean) return (value: string | boolean): TokenMatchResult<Boolean> => {
		if (value === true) return tupleResult.success(true)
		if (value === false) return tupleResult.success(false)

		const lowerValue = value.toLowerCase()
		if (lowerValue === 'true' || lowerValue === 't' || value === '1') return tupleResult.success(true)
		if (lowerValue === 'false' || lowerValue === 'f' || value === '0') return tupleResult.success(false)
		return tupleResult.error(new Error(`"${value}" is not a boolean`))
	}

	if (type === Number) return (value: string | number): TokenMatchResult<Number> => {
		const numberValue = +value
		if (Number.isNaN(numberValue)) return tupleResult.error(new Error(`"${value}" is not a number`))
		return tupleResult.success(numberValue)
	}

	if (type === Date) return (value: string | Date): TokenMatchResult<Date> => {
		try {
			const dateValue = (value instanceof Date) ? value : new Date(value)
			if (Number.isNaN(dateValue.getTime())) return tupleResult.error(new Error(`"${String(value)}" is not a valid date`))
			return tupleResult.success(dateValue)
		}
		catch (error) {
			return tupleResult.error(error)
		}
	}

	// This is merely an illustration, this should never happen
	if (isWildcardConstructor(type)) {
		return tupleResult.error(new Error('wildcard already has a matcher, please use the `wildcard()` function and not `token()` for constructing wildcards.'))
	}

	if (isRoute(type)) {
		// Parent routes are matched in routeMatcher directly, never via getMatcher
		return tupleResult.error(new Error('unexpected: Route passed to getMatcher'))
	}

	return tupleResult.error(new Error('Custom parameter types are not yet implemented'))
}

/** Internal brand that distinguishes a {@link WildcardParameter} from a {@link PathParameter}. */
const wildcardBrand: unique symbol = Symbol.for('@rooted/wildcardParameterToken')

type Wildcard = string & { [wildcardBrand]: true }
type WildcardParameter<K extends string> = Parameter<K, Wildcard>

/**
 * Declares a catch-all path parameter for use inside a {@link route} template string.
 *
 * A wildcard matches the remainder of the URL path (one or more characters) and
 * exposes it as a `string`. It must be the last interpolation in the pattern and
 * must be preceded by a `/`.
 *
 * @param name - Property name in the `tokens` dictionary. Defaults to `'rest'`.
 *
 * @example
 * ```ts
 * import { route, wildcard } from '@rooted/router'
 *
 * export const ArchiveRoute = route`/archive/${wildcard()}/`({
 *   resolve: ({ create, tokens }) => create(Archive, { slug: tokens.rest })
 * })
 * // tokens.rest is typed as `string`
 * ```
 *
 * @example Custom key
 * ```ts
 * export const ArchiveRoute = route`/archive/${wildcard('slug')}/`({
 *   resolve: ({ create, tokens }) => create(Archive, { slug: tokens.slug })
 * })
 * ```
 *
 * @see {@link token}
 * @see {@link route}
 */
export function wildcard<K extends string = 'rest'>(name = 'rest' as K): Parameter<K, Wildcard> {
	function match(value: string): TokenMatchResult<Wildcard> {
		return tupleResult.success(value as Wildcard)
	}

	return {
		key: name,
		type: Object.assign(name, { [wildcardBrand]: true }) as Wildcard,
		match,
		[tokenBrand]: true,
	}
}

function isWildcardConstructor(type: ParameterType): type is Wildcard {
	return typeof type === 'object' && type !== null && wildcardBrand in (type as object)
}
/** Returns `true` if `token` is a {@link WildcardParameter}. */
export function isWildcardParameter<K extends string>(token: Parameter<K, any>): token is WildcardParameter<K> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	return typeof token === 'object' && token !== null && isWildcardConstructor(token.type)
}
/** Returns `true` if `token` is a constant-values {@link Parameter} created with `token(name, [...values])`. */
export function isConstantParameter<K extends string>(token: Parameter<K, any>): token is Parameter<K, Constant> {
	return typeof token === 'object' && token !== null && Array.isArray(token.type) && constantBrand in token.type
}
/** Internal brand that distinguishes a {@link WildcardParameter} from a {@link PathParameter}. */
const tokenBrand: unique symbol = Symbol.for('@rooted/parameterToken')
/** Returns `true` if `value` is a {@link Parameter}. */
export function isParameterToken(token: unknown): token is Parameter {
	return typeof token === 'object' && token !== null && tokenBrand in token
}
