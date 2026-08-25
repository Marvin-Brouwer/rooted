/**
 * Names the rooted build plugins register under.
 *
 * Plugins find each other through `resolvedConfig.plugins.find(p => p.name === ...)`
 * rather than by importing one another, so these strings are a contract between
 * packages. Import them instead of writing the literal.
 */

/** The SEO plugin, which exposes {@link SeoApi} on its `api` property. */
export const seoPluginName = 'rooted:seo'

/** The route manifest plugin from `@rooted/router/manifest`. */
export const routeManifestPluginName = 'vite-plugin:generate-rooted-route-manifest'
