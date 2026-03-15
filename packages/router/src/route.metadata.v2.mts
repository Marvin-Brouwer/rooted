import type { RouteParameter } from './route.tokens.v2.mts'

/** Symbol key for the {@link RouteMetadata} bag attached to every {@link Route}. */
export const routeMetaData: unique symbol = Symbol.for('rooted:route-metadata')

export type RouteMetadata<T extends { parameters: any; parent?: any }> = {
	/** The typed path token descriptors declared with {@link token}. */
	readonly tokenTypes: T['parameters']
	/** The parent route, if this route is nested. */
	readonly parentType: T extends { parent: infer P } ? P : never
	/** `true` if this route's pattern includes any parameters. */
	readonly hasParameterTokens: boolean
	/** `true` if this route's pattern ends with a wildcard parameter. */
	readonly hasWildcard: boolean
	/** Present and `true` when the route pattern has validation errors. */
	readonly hasErrors?: true
	/** The split-up parts of the route pattern. */
	readonly routeParts: Array<string | RouteParameter>
}

/** Returns `true` if `instance` is a {@link Route}. */
export function isRoute<T extends import('./route.tokens.v2.mts').Parameter[]>(
	instance: unknown
): instance is import('./route.v2.mts').Route<import('./route.v2.mts').RouteParameters<T>>
export function isRoute(instance: unknown): instance is import('./route.v2.mts').Route<any> {
	return typeof instance === 'object' && instance !== null && routeMetaData in instance
}
