/**
 * Names the rooted build plugins register under.
 *
 * Plugins find each other through `resolvedConfig.plugins.find(p => p.name === ...)`
 * rather than by importing one another, so these strings are a contract between
 * packages. Import them instead of writing the literal.
 */

/** The SEO plugin, which exposes {@link SeoApi} on its `api` property. */
export const seoPluginName = 'rooted:seo'

/**
 * The route manifest plugin from `@rooted/router/manifest`.
 *
 * The router declares this name itself, and this is a copy. It has to be:
 * `@rooted/router` is an optional peer here, so importing the value would make
 * the routing-free half of this package need the router at runtime. If you
 * change the name, change it in `packages/router/plugins/manifest.mts` too.
 */
export const routeManifestPluginName = 'vite-plugin:generate-rooted-route-manifest'
