/**
 * Rooted routing utility, simple and lean
 * @module
 */

export * from '../navigation.mts'
export * from '../navigation-link.mts'

export * from '../href.export.mts'

export * from '../router.mts'
export { token, wildcard, type Parameter, type RouteParameter, type ParameterType, type ParameterTokenType } from '../route.tokens.mts'
export type { RouteMatch, MatchRouteOptions } from '../route.match.mts'

export { route, type Route, type RouteBuilder, type RouteParameterDictionary } from '../route.mts'

export * from '../gate.mts'