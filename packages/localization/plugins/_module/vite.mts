/**
 * Build-time Vite plugins for `@rooted/localization`.
 * `localizationSeo` adds hreflang alternate links to prerendered localized pages through the rooted SEO plugin,
 * `localizationDictionaryCheck` reports dictionary entries that are missing or unused.
 *
 *
 * - [Localization guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/localization.md)
 * - [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md)
 *
 * @module
 */

export { localizationDictionaryCheck, type DictionaryCheckOptions } from '../dictionary-check.mts'
export { localizationSeo } from '../hreflang.mts'
