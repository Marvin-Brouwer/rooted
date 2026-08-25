/**
 * Route-aware SEO for the rooted framework. Per-page metadata from the route
 * manifest, route entries in `sitemap.xml`, and `llms.txt`.
 *
 * Needs `@rooted/router`. Everything that doesn't depend on routing lives in
 * `@rooted/seo`.
 *
 *
 * - [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md)
 * - [Routing guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/routing.md)
 *
 * @module
 */

export { routeSeoPlugin, routeSeoPluginName } from '../route-seo.mts'
export { llmsTxtPlugin } from '../llms-txt.mts'
export { resolveRouteSeo } from '../resolve-route-seo.mts'
