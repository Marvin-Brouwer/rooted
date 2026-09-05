/**
 * Route-aware SEO for the rooted framework. Supplies the pages and per-page
 * metadata that `@rooted/seo` needs, read from the route manifest.
 *
 * Comes as a pair with `@rooted/router`; importing this without it won't type
 * check. Add `routeSeoPlugin()` to your Vite config next to
 * `generateRouteManifest()`. Everything that doesn't depend on routing lives in
 * `@rooted/seo` and is wired up for you by `rootedManifest`.
 *
 *
 * - [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md)
 * - [Routing guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/routing.md)
 *
 * @module
 */

export { routeSeoPlugin, routeSeoPluginName } from '../route-seo.mts'
export { resolveRouteSeo } from '../resolve-route-seo.mts'
