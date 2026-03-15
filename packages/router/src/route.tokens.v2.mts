import { tupleResult, TupleResult } from '@rooted/util'
import { isRoute } from './route.metadata.v2.mts'
import type { Route } from './route.v2.mts'

/** The constructor types accepted as the `type` argument to {@link token}. */
export type ParameterType =
	| NumberConstructor
	| StringConstructor
	| BooleanConstructor
	| DateConstructor
	| Wildcard

export type ParameterTokenType =
	| Number
	| String
	| Boolean
	| Date
	| Wildcard
	| Route<any>

type ParameterToTokenType<V extends ParameterType> =
	V extends NumberConstructor ? Number :
	V extends StringConstructor ? String :
	V extends BooleanConstructor ? Boolean :
	V extends DateConstructor ? Date :
	V extends Wildcard ? Wildcard :
	V extends Route<any> ? V :
	never

/** Maps a {@link ParameterTokenType} to the TypeScript value type it produces at runtime. */
export type ParameterToValueType<V extends ParameterTokenType> =
	V extends Number ? number :
	V extends String ? string :
	V extends Boolean ? boolean :
	V extends Date ? Date :
	V extends Wildcard ? string :
	never

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

	match(parameter: string): TokenMatchResult<T>,
	[tokenBrand]: true,
}

export type RouteParameter = Parameter | Route<any>

/**
 * Declares a typed path parameter for use inside a {@link route} template string.
 *
 * The matched URL segment is automatically coerced to the specified `type`. If
 * coercion fails (e.g. `"abc"` for `Number`), the route is treated as a non-match.
 *
 * @param name - Property name in the `tokens` dictionary passed to `resolve`.
 * @param type - One of `Number`, `String`, `Boolean`, or `Date`.
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
 * @see {@link wildcard}
 * @see {@link route}
 */
export function token<K extends string = string, T extends ParameterType = ParameterType>(name: K, type: T): Parameter<K, ParameterToTokenType<T>> {

	const match = getMatcher<T>(type) as (value: string) => TokenMatchResult<ParameterToTokenType<T>>

	return {
		key: name,
		type: type as ParameterToTokenType<T>,
		match,
		[tokenBrand]: true,
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
			if (Number.isNaN(dateValue.getTime())) return tupleResult.error(new Error(`"${value}" is not a valid date`))
			return tupleResult.success(dateValue)
		} catch (error) {
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
const wildcardBrand: unique symbol = Symbol.for('rooted:wildcard')

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
	return typeof type === 'object' && type !== null && wildcardBrand in token
}
/** Returns `true` if `token` is a {@link WildcardParameter}. */
export function isWildcardParameter<K extends string>(token: Parameter<K, any>): token is WildcardParameter<K> {
	return typeof token === 'object' && token !== null && isWildcardConstructor(token.type)
}
/** Internal brand that distinguishes a {@link WildcardParameter} from a {@link PathParameter}. */
const tokenBrand: unique symbol = Symbol.for('rooted:parameterToken')
/** Returns `true` if `value` is a {@link Parameter}. */
export function isParameterToken(token: unknown): token is Parameter {
	return typeof token === 'object' && token !== null && tokenBrand in token
}