/**
 * SEO metadata for one page.
 *
 * Structurally the same as `RouteSeoMetadata` from `@rooted/router/routes`, on
 * purpose. Routes declare their seo with the router's type, and it lands here
 * without a conversion. Keeping a copy is what lets this package work without
 * `@rooted/router` installed. If you change one, change the other.
 */
export type PageSeoMetadata = {
	/** Page title. Overrides `<title>` and `og:title`. */
	title?: string
	/** Page description. Overrides `<meta name="description">` and `og:description`. */
	description?: string
	/** When `true`, injects `<meta name="robots" content="noindex">`. Default: `false`. */
	noIndex?: boolean
	/** When `true`, omits this page from sitemap generation. Default: `false`. */
	excludeFromSitemap?: boolean
	/**
	 * Override for `og:image`. Accepts an absolute URL or a root-relative path.
	 * Falls back to the generated PWA icon (`pwa-512x512.png`) when omitted.
	 */
	image?: string
	/** Sitemap `changefreq` field. */
	changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
	/** Sitemap `priority` field (0.0-1.0). */
	priority?: number
}


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
 * A `<link>` tag to add to the head of a prerendered route page.
 */
export type RouteHeadLink = {
	/** Link relation, e.g. `'alternate'`. */
	rel: string
	/** Language code (or `'x-default'`) for `rel="alternate"` links. */
	hreflang?: string
	/**
	 * Root-relative path the link points at (e.g. `/nl-NL/about/`).
	 * The SEO plugin resolves it against the deployment URL or the Vite base.
	 */
	path: string
}

/**
 * Returns extra head links for a prerendered path, or `undefined` when the
 * path has none.
 *
 * Called lazily while the adapter injects per-route HTML (during
 * `closeBundle`), so all plugins have started by then. Register the provider
 * early, in `configResolved` or `buildStart`.
 */
export type RouteHeadLinkProvider = (staticPath: string) => RouteHeadLink[] | undefined

/**
 * Free-form transform applied to a prerendered page's HTML, after meta tags
 * and head links. Use it for changes the other seams can't express, like
 * setting the `lang` attribute on the `<html>` tag.
 */
export type RouteHtmlTransform = (html: string, staticPath: string) => string

/**
 * Returns the SEO metadata for a prerendered path, or `undefined` when the
 * path has none.
 *
 * This is how route metadata reaches the SEO plugin. `@rooted/seo` has no idea
 * what a route is, so `@rooted/seo/router` registers a provider that walks the
 * route manifest. Register it in `configResolved` or `buildStart`.
 */
export type RouteSeoProvider = (staticPath: string) => PageSeoMetadata | undefined

/**
 * A page to include in the main `sitemap.xml`, identified by its static path.
 *
 * Paths rather than URLs, because only the SEO plugin knows the deployment URL
 * and base path. It turns these into absolute `loc` values.
 */
export type SitemapPageEntry = Omit<SitemapEntry, 'loc'> & {
	/** Static path of the page, e.g. `/categories/`. */
	path: string
}

/**
 * Returns pages to merge into the main `sitemap.xml`.
 *
 * Called once during `closeBundle`, after {@link SeoApi.prepare}. Pages whose
 * resolved URL is already present are skipped, so the first provider to claim
 * a URL wins.
 */
export type SitemapEntryProvider = () => Promise<SitemapPageEntry[]>

/**
 * A custom section in the generated `llms.txt`, used to override or extend
 * the auto-generated "Pages" section.
 */
export type LlmsTxtSection = {
	/** Heading shown as `## Title` in the output. */
	title: string
	entries: Array<{
		title: string
		url: string
		description?: string
	}>
}

/**
 * Options for the generated `llms.txt` file.
 */
export type LlmsTxtOptions = {
	/**
	 * Markdown block inserted between the site description and the auto-generated
	 * "Pages" section. Useful for adding extra context, disclaimers, or links.
	 */
	intro?: string
	/**
	 * Override the auto-generated "Pages" section with custom groupings.
	 * When omitted, all static routes with a `seo.title` are listed under "Pages".
	 */
	sections?: LlmsTxtSection[]
}

/**
 * Async work that must finish before any route seo is evaluated at build
 * time, e.g. preloading lazily imported dictionaries. Registered tasks run
 * once, awaited by every build consumer through {@link SeoApi.prepare}.
 */
export type SeoPrepareTask = () => Promise<void>

/**
 * Inter-plugin API exposed by the `rooted:seo` Vite plugin.
 *
 * Retrieve it in `configResolved` or `buildStart`:
 * ```ts
 * const plugin = config.plugins.find(p => p.name === seoPluginName)
 * const seoApi = (plugin as { api?: SeoApi } | undefined)?.api
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
	 * Metadata comes from the providers registered with
	 * {@link SeoApi.addRouteSeoProvider}, so the caller doesn't need to know
	 * where a page's SEO came from.
	 *
	 * @param html - The source HTML string to transform.
	 * @param staticPath - The page's static path (e.g. `/categories/`), used to
	 *   look up its metadata and build the canonical URL.
	 */
	injectRouteHtml(html: string, staticPath: string): string
	/**
	 * Injects root-level SEO into the home `index.html`.
	 *
	 * Adds a JSON-LD `WebSite` schema block, a `<link rel="canonical">` for the
	 * root URL, and an `og:url` / `og:image` / `og:type` block.
	 *
	 * @param html - The source HTML string to transform.
	 */
	injectRootHtml(html: string): string
	/**
	 * Registers a provider of extra `<link>` head tags per prerendered path,
	 * e.g. `rel="alternate" hreflang` links for localized routes.
	 *
	 * Providers are evaluated lazily inside {@link SeoApi.injectRouteHtml}, so
	 * registering in `configResolved` or `buildStart` is always early enough.
	 */
	addRouteHeadLinks(provider: RouteHeadLinkProvider): void
	/**
	 * Registers a source of per-page SEO metadata for {@link SeoApi.injectRouteHtml}.
	 * Providers are asked in registration order and the first non-`undefined`
	 * answer wins.
	 */
	addRouteSeoProvider(provider: RouteSeoProvider): void
	/**
	 * Registers a source of sitemap entries for the main `sitemap.xml`.
	 */
	addSitemapEntryProvider(provider: SitemapEntryProvider): void
	/**
	 * Registers a transform applied to each prerendered page's HTML at the end
	 * of {@link SeoApi.injectRouteHtml}.
	 */
	addRouteHtmlTransform(transform: RouteHtmlTransform): void
	/**
	 * Registers async work that must finish before route seo is evaluated at
	 * build time. Call from `configResolved` or `buildStart`.
	 */
	addPrepareTask(task: SeoPrepareTask): void
	/**
	 * Runs all registered prepare tasks once (later calls await the same run).
	 * Build consumers await this before evaluating route seo.
	 */
	prepare(): Promise<void>
}
