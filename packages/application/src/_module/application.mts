/**
 * Build-time configuration for rooted apps. Use `rootedManifest({...})` as the default export of `vite.config.mts`.
 *
 * It wires up the SEO plugins from `@rooted/seo` for you, so most apps never import those directly.
 *
 * @module
 */

export * from '../rooted-manifest.mts'
export type { ImportCycleOptions } from '../../plugins/import-cycle-detector.mts'

// Re-exported so plugin authors don't have to reach into `@rooted/util`.
// Read from here it answers for the build process, not for the app: 'server' normally,
// and 'preRenderer' while the static render pass is running.
export { environment, type Environment } from '@rooted/util'
