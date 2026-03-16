/**
 * Rooted routing utility, simple and lean
 *
 * For the application router setup use `@rooted/router/application`
 * @module
 */

export * from '../router.mjs'
export { token, wildcard, type Parameter, type RouteParameter, type ParameterType, type ParameterTokenType } from '../route.tokens.mjs'
export type { RouteMatch, MatchRouteOptions } from '../route.match.mjs'

export { route, type Route, type RouteBuilder, type RouteParameterDictionary } from '../route.mjs'
