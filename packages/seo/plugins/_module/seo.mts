/**
 * Build-time SEO for the rooted framework. Meta tags, Open Graph, canonical
 * links, sitemaps and `robots.txt`.
 *
 * Nothing here knows about routing. For per-page metadata from the route
 * manifest, route entries in `sitemap.xml`, and `llms.txt`, add
 * `@rooted/seo/router`.
 *
 *
 * - [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md)
 *
 * @module
 */

export { seoPlugin, type SeoOptions } from '../seo.mts'
export { robotsPlugin, type RobotsOptions } from '../robots.mts'
export { llmsTxtPlugin } from '../llms-txt.mts'
export { gitLastModified } from '../git-last-modified.mts'
export { seoPluginName, routeManifestPluginName } from '../plugin-names.mts'
export type {
	AdditionalSitemap,
	LlmsTxtOptions,
	LlmsTxtSection,
	PageSeoMetadata,
	RouteHeadLink,
	RouteHeadLinkProvider,
	RouteHtmlTransform,
	PageEntry,
	PageProvider,
	RouteSeoProvider,
	SeoApi,
	SeoPrepareTask,
	SitemapEntry,
} from '../seo-api.mts'
