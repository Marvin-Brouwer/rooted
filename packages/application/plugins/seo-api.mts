import type { RouteSeoMetadata } from '@rooted/router/routes'

/**
 * A single URL entry in a sitemap or additional sitemap.
 */
export type SitemapEntry = {
	/** Absolute URL of the page or asset. */
	loc: string
	/** Last modification date in `YYYY-MM-DD` format. */
	lastmod?: string
	/**
	 * How frequently the content at this URL changes.
	 * Maps to the `<changefreq>` XML element.
	 */
	changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
	/** Relative priority of this URL (0.0–1.0). Maps to the `<priority>` XML element. */
	priority?: number
	/** Image entries for image sitemaps (`xmlns:image` extension). */
	images?: Array<{
		loc: string
		title?: string
		caption?: string
	}>
}

/**
 * An additional sitemap to register with the SEO plugin.
 * Written to `sitemap-{name}.xml` and included in `sitemap-index.xml`.
 */
export type AdditionalSitemap = {
	/** Used as the filename suffix: `sitemap-{name}.xml`. */
	name: string
	entries: SitemapEntry[]
}

/**
 * Inter-plugin API exposed by the `rooted:seo` Vite plugin.
 *
 * Retrieve it in `configResolved` or `buildStart`:
 * ```ts
 * const seoPlugin = config.plugins.find(p => p.name === 'rooted:seo')
 * const seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
 * seoApi?.addSitemap({ name: 'icons', entries: [...] })
 * ```
 */
export type SeoApi = {
	/**
	 * Registers an additional sitemap to include in the sitemap index.
	 * Call this from `buildStart` or `configResolved`, before `closeBundle` runs.
	 */
	addSitemap(sitemap: AdditionalSitemap): void
	/**
	 * Returns the URL of the primary sitemap file for use in `robots.txt`.
	 *
	 * Returns `sitemap-index.xml` when additional sitemaps are registered,
	 * `sitemap.xml` otherwise. Returns `undefined` when no deployment URL is configured.
	 */
	getSitemapUrl(): string | undefined
	/**
	 * Injects per-page meta tags into an HTML string for a static route.
	 *
	 * Inserts `<title>`, `<meta name="description">`, `<link rel="canonical">`,
	 * `<meta name="robots">` (when `noIndex` is true), and Open Graph tags.
	 * Tags that already exist in the HTML are left unchanged.
	 *
	 * @param html - The source HTML string to transform.
	 * @param seo - The SEO metadata from `route.getMetadata().seo`, or `undefined`.
	 * @param staticPath - The route's static path (e.g. `/categories/`), used to
	 *   build the canonical URL.
	 */
	injectRouteHtml(html: string, seo: RouteSeoMetadata | undefined, staticPath: string): string
	/**
	 * Injects root-level SEO into the home `index.html`.
	 *
	 * Adds a JSON-LD `WebSite` schema block, a `<link rel="canonical">` for the
	 * root URL, and an `og:url` / `og:image` / `og:type` block.
	 *
	 * @param html - The source HTML string to transform.
	 */
	injectRootHtml(html: string): string
}
