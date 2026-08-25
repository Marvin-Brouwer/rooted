/**
 * Build-time SEO for the rooted framework. Meta tags, Open Graph, canonical
 * links, sitemaps and `robots.txt`.
 *
 * Nothing here knows about routing. For per-route metadata, sitemap entries
 * built from the route manifest, and `llms.txt`, add `@rooted/seo/router`.
 *
 *
 * - [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md)
 *
 * @module
 */

export { robotsPlugin, type RobotsOptions } from '../robots.mts'
export { injectCanonical, injectHeadLinks, injectMetaTags, injectOgTags, injectRootJsonLd } from '../seo-html.mts'
export { buildSitemapIndexXml, buildSitemapXml } from '../seo-sitemap.mts'
export { seoPluginName, routeManifestPluginName } from '../plugin-names.mts'
export type {
	AdditionalSitemap,
	PageSeoMetadata,
	RouteHeadLink,
	RouteHeadLinkProvider,
	RouteHtmlTransform,
	SeoApi,
	SeoPrepareTask,
	SitemapEntry,
} from '../seo-api.mts'
