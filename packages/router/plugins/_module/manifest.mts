/**
 * Vite plugin that auto-discovers `_routes.mts` files and writes a single
 * aggregator module (`_routes.g.mts`) that re-exports every route. Spread
 * the result into `router({ ... })`.
 *
 *
 * - [Application model](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/application-model.md)
 * - [Routing guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/routing.md)
 *
 * @module
 */

export * from '../manifest.mts'
