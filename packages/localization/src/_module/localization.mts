/**
 * URL-based localization for the rooted framework. Configure once with
 * `configureLocalization`, put `localization.parameter` in your route
 * patterns, and translate text with the `localization.text` tagged template.
 *
 *
 * - [Localization guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/localization.md)
 * - [Routing guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/routing.md)
 *
 * @module
 */

export { configureLocalization, type Localization, type LocalizationOptions, type LocalizationRoute, type SupportedLocales } from '../localization.mts'
export { template, type Dictionary } from '../dictionary.mts'
export { localeTokenBrand, type LocaleParameter, type LocaleTokenInfo } from '../locale-token.mts'
export type { ObserveHreflangOptions } from '../hreflang.mts'
