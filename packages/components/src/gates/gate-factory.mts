
import { component } from '../component.mts'
import type { Component } from '../component.mts'
import type { GenericComponent } from '../component/generic-component.mts'

export const typedParameter: unique symbol = Symbol.for('rooted:typed-parameter')

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

export type GateParameters<G> = G extends { [typedParameter]: infer T extends PathParameter[] }
	? { [P in T[number]as P['key']]: ParameterValueType<P['matches']> }
	: never

type OmitGate<O> = O extends never ? never : Omit<O, 'gate'>

export type BoundGateDefinition<O extends {}, T extends PathParameter[]> = Component<OmitGate<O>> & {
	readonly [typedParameter]: T
	matchFrom(path: string, offset?: number): MatchResult | false
	match(url: URL): Record<string, unknown> | false
	append<O2 extends {}>(component: Component<O2>): (strings: TemplateStringsArray, ...values: PathParameter[]) => BoundGateDefinition<O2, PathParameter[]>
}

type UnboundGateDefinition = {
	matchFrom(path: string, offset?: number): MatchResult | false
	match(url: URL): Record<string, unknown> | false
	append(strings: TemplateStringsArray, ...values: PathParameter[]): UnboundGateDefinition
}

export function gate<O extends {}>(inner: Component<O>) {
	return function <T extends PathParameter[]>(strings: TemplateStringsArray, ...values: T): BoundGateDefinition<O, T> {
		return bindComponentToGate(inner, buildGate(strings, values)) as BoundGateDefinition<O, T>
	}
}

function bindComponentToGate<O extends {}>(inner: Component<O>, gateDef: UnboundGateDefinition): BoundGateDefinition<O, PathParameter[]> {
	const bound = component<OmitGate<O>>({
		name: inner.name + '-gate',
		onMount(ctx) {
			const { append, signal } = ctx
			const options = (ctx as any).options as OmitGate<O> | undefined
			let el: GenericComponent | null = null

			const update = () => {
				const result = gateDef.matchFrom(location.pathname)
				if (result) {
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
	bound.matchFrom = gateDef.matchFrom.bind(gateDef)
	bound.match = gateDef.match.bind(gateDef)
	bound.append = (<O2 extends {},>(subComponent: Component<O2>) =>
		(strings: TemplateStringsArray, ...values: PathParameter[]) =>
			bindComponentToGate(subComponent, gateDef.append(strings, ...values))) as BoundGateDefinition<O, PathParameter[]>['append']

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
