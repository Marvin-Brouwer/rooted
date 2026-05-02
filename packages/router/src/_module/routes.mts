/**
 * Rooted routing utility, simple and lean
 *
 * For the `_routes.mts` setup use `@rooted/router/routes`
 * @module
 */

export { token, wildcard, type Parameter, type RouteParameter, type ParameterType, type ParameterTokenType } from '../route.tokens.mts'
export type { RouteMatch, MatchRouteOptions } from '../route.match.mts'

export { route, type Route, type RouteBuilder, type RouteParameterDictionary } from '../route.mts'
export type { RouteMetadata, RouteSeoMetadata } from '../route.metadata.mts'
