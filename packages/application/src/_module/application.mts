/**
 * Build-time configuration and SEO tooling for rooted apps. Use
 * `rootedManifest({...})` as the default export of `vite.config.mts`.
 *
 *
 * - [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md)
 *
 * @module
 */

export * from '../rooted-manifest.mts'
export type { AdditionalSitemap, SeoApi, SitemapEntry } from '../seo.api.mts'
export type { LlmsTxtOptions, LlmsTxtSection } from '../../plugins/llms-txt.mts'
export type { SeoOptions } from '../../plugins/seo.mts'
