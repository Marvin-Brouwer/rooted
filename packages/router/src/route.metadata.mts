import type { Route, RouteParameters } from './route.mts'
import type { Parameter, RouteParameter } from './route.tokens.mts'

/** Symbol key for the {@link RouteMetadata} bag attached to every {@link Route}. */
export const routeMetadata: unique symbol = Symbol.for('@rooted/route-metadata')

/**
 * Internal metadata bag stored on every {@link Route} under the {@link routeMetadata} symbol key.
 *
 * Do not access directly from application code — use {@link isRoute} to test whether a value is a
 * route, and access `route[routeMetaData]` only within router internals.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteMetadata<T extends { parameters: any, parent?: any }> = {
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
	/** Resolved static path string if this route has no dynamic segments, `false` otherwise. */
	readonly staticRoute: false | string
}

/** Returns `true` if `instance` is a {@link Route}. */
export function isRoute<T extends RouteParameters<Parameter[]>>(instance: Route<T>): instance is Route<T>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRoute<T>(instance: T): instance is Extract<T, Route<any>>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRoute<T extends Route<any>>(instance: T): instance is T
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRoute(instance: unknown): instance is Route<any> {
	return typeof instance === 'object' && instance !== null && routeMetadata in instance
}
