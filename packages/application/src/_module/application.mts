/**
 * Build-time configuration for rooted apps. Use `rootedManifest({...})` as the
 * default export of `vite.config.mts`.
 *
 * It wires up the SEO plugins from `@rooted/seo` for you, so most apps never
 * import those directly.
 *
 * @module
 */

export * from '../rooted-manifest.mts'
