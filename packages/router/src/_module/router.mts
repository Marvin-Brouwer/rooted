/**
 * Rooted routing utility, simple and lean
 * @module
 */


export { route, gate, wildcard, token, type RouteParameters as GateParameters, type RouteFilter, type RouteDefinition, type BoundGateDefinition, type OmitGate } from '../gate-factory.mjs'
export { router, isRoute } from '../router.mts'
export { href, type Url, type Path } from '../href.mts'

export * from '../navigation.mts'
export * from '../navigation-link.mts'