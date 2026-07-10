/**
 * Route declarations. Use this from your `_routes.mts` files. Exports `route`,
 * `token`, `wildcard`, and the supporting types.
 *
 *
 * - [Routing guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/routing.md)
 * - [Application model](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/application-model.md)
 *
 * @module
 */

export { token, wildcard, isConstantParameter, type Constant, type Parameter, type RouteParameter, type ParameterType, type ParameterTokenType } from '../route.tokens.mts'
export type { RouteMatch, MatchRouteOptions } from '../route.match.mts'

export { route, type Route, type RouteBuilder, type RouteParameterDictionary } from '../route.mts'
export type { RouteMetadata, RouteSeoMetadata } from '../route.metadata.mts'
