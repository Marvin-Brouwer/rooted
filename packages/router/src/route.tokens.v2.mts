import { tupleResult, TupleResult } from '@rooted/util'
import { isRoute, Route } from './route.v2.mts'

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

export type ParameterToValueType<V extends ParameterTokenType> =
	V extends Number ? number :
	V extends String ? string :
	V extends Boolean ? boolean :
	V extends Date ? Date :
	V extends Wildcard ? string :
	never

export type TokenMatchResult<T extends ParameterTokenType = ParameterTokenType> = TupleResult<T>

export type ParameterToken<K extends string = string, T extends ParameterTokenType = ParameterTokenType> = {
	key: K
	// TODO maybe symbol
	type: T

	match(parameter: string): TokenMatchResult<T>
}

export type RouteParameter = ParameterToken | Route<any>

// TODO these are just test values, remove when done
const s = token('string', String)
const n = token('number', Number)
const b = token('boolean', Boolean)
const d = token('date', Date)
const w = wildcard()
//

export function token<K extends string = string, T extends ParameterType = ParameterType>(name: K, type: T): ParameterToken<K, ParameterToTokenType<T>> {

	const match = getMatcher<T>(type) as (value: string) => TokenMatchResult<ParameterToTokenType<T>>

	return {
		key: name,
		type: type as ParameterToTokenType<T>,
		match
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
		if (Number.isNaN(numberValue)) tupleResult.error(new Error(`"${value}" is not a number`))
		return tupleResult.success(numberValue)
	}

	if (type === Date) return (value: string | Date): TokenMatchResult<Date> => {
		try {
			const dateValue = (value instanceof Date) ? value : new Date(value)
			if (Number.isNaN(dateValue.getTime())) tupleResult.error(new Error(`"${value}" is not a valid date`))
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
		// TODO, this SHOULD never happen, we still need to implement proper routing though.
		return tupleResult.error(new Error('parent handling not yet implemented'))
	}

	return tupleResult.error(new Error('Custom parameter types are not yet implemented'))
}

/** Internal brand that distinguishes a {@link WildcardParameter} from a {@link PathParameter}. */
const wildcardBrand: unique symbol = Symbol.for('rooted:wildcard')

type Wildcard = string & { [wildcardBrand]: true }
type WildcardParameter<K extends string> = ParameterToken<K, Wildcard>

export function wildcard<K extends string = 'rest'>(name = 'rest' as K): ParameterToken<K, Wildcard> {

	// TODO either handle wildcard differently in router, or also post the entire route to match, or pass the current position to match

	function match(value: string): TokenMatchResult<Wildcard> {
		return tupleResult.success(value as Wildcard)
	}

	return {
		key: name,
		type: Object.assign(name, { [wildcardBrand]: true }) as Wildcard,
		match
	}
}

function isWildcardConstructor(type: ParameterType): type is Wildcard {
	return typeof type === 'object' && type !== null && wildcardBrand in token
}
/** Returns `true` if `token` is a {@link WildcardParameter}. */
export function isWildcardParameter<K extends string>(token: ParameterToken<K, any>): token is WildcardParameter<K> {
	return typeof token === 'object' && token !== null && isWildcardConstructor(token.type)
}
/** Internal brand that distinguishes a {@link WildcardParameter} from a {@link PathParameter}. */
const tokenBrand: unique symbol = Symbol.for('rooted:parameterToken')
export function isParameterToken(token: unknown): token is ParameterToken {
	return typeof token === 'object' && token !== null && tokenBrand in token
}