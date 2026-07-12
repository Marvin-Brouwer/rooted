import { token } from '@rooted/router/routes'

import type { Constant, Parameter } from '@rooted/router/routes'

/**
 * Brand key identifying THE locale token on route parts.
 *
 * Uses `Symbol.for` so build tooling can find the token across duplicate
 * module instances (route manifests are loaded through jiti at build time).
 * The brand carries a {@link LocaleTokenInfo} payload, so tooling reads the
 * configured locales straight off the token without extra configuration.
 */
export const localeTokenBrand: unique symbol = Symbol.for('@rooted/localization/localeToken')

/** The locale configuration carried on a {@link LocaleParameter} via {@link localeTokenBrand}. */
export type LocaleTokenInfo = {
	defaultLocale: string
	locales: readonly string[]
	/**
	 * Loads one locale's dictionary, same as `localization.load`. Carried on
	 * the token so build tooling can preload dictionaries before evaluating
	 * lazy seo resolvers, without knowing the localization instance.
	 */
	load(locale: string): Promise<void>
}

/**
 * The route parameter produced by `configureLocalization`. A constant-values
 * token keyed `'locale'`, branded with the configured locales.
 */
export type LocaleParameter<TLocale extends string> = Parameter<'locale', Constant<TLocale>> & { [localeTokenBrand]: LocaleTokenInfo }

/** @internal Creates the branded locale token for a set of configured locales. */
export function createLocaleParameter<TLocale extends string>(
	defaultLocale: TLocale,
	locales: readonly TLocale[],
	load: (locale: string) => Promise<void>,
): LocaleParameter<TLocale> {
	const parameter = token('locale', locales as readonly TLocale[] as readonly [TLocale, ...TLocale[]])
	return Object.assign(parameter, {
		[localeTokenBrand]: { defaultLocale, locales, load } satisfies LocaleTokenInfo,
	}) as LocaleParameter<TLocale>
}
