/**
 * App-side router setup. The `router(...)` factory plus everything you need
 * to declare routes (`route`, `token`, `wildcard`) and react to navigation
 * events.
 *
 *
 * - [Routing guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/routing.md)
 *
 * @module
 */

export * from '../router.mts'
export { token, wildcard, type Parameter, type RouteParameter, type ParameterType, type ParameterTokenType } from '../route.tokens.mts'
export type { RouteMatch, MatchRouteOptions } from '../route.match.mts'

export { route, type Route, type RouteBuilder, type RouteParameterDictionary } from '../route.mts'
export type { RouteSeoMetadata } from '../route.metadata.mts'

export { NavigateEvent, NavigationErrorEvent, type NavigateHandler, type ErrorHandler } from '../navigate-event.mts'
