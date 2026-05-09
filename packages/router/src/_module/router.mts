/**
 * Routing primitives for the rooted framework. The user-facing surface:
 * `Link`, `navigate`, `href`, `gate`, the navigation events, and the option
 * types for the router itself.
 *
 *
 * - [Routing guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/routing.md)
 * - [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md)
 *
 * @module
 */

export * from '../navigation.mts'
export * from '../navigation-link.mts'

export * from '../href.export.mts'

export * from '../gate.mts'

export { NavigateEvent, NavigationErrorEvent, type NavigateHandler, type ErrorHandler } from '../navigate-event.mts'
export type { RouterOptions } from '../router.mts'
export type { RouterSeoOptions } from '../seo-meta.mts'
export type { AnyRoute, UnknownRoute, MatchableRoute, EmptyRoute } from '../route.mts'
