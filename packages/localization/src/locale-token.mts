import { token } from '@rooted/router/routes'

import type { Dictionary } from './dictionary.mts'
import type { Constant, Parameter } from '@rooted/router/routes'

/**
 * Brand key identifying THE locale token on route parts.
 *
 * Uses `Symbol.for` so build tooling can find the token across duplicate module instances (route manifests are loaded through jiti at build time).
 * The brand carries a {@link LocaleTokenInfo} payload,
 * so tooling reads the configured locales straight off the token without extra configuration.
 */
export const localeTokenBrand: unique symbol = Symbol.for('@rooted/localization/localeToken')

/** The locale configuration carried on a {@link LocaleParameter} via {@link localeTokenBrand}. */
export type LocaleTokenInfo = {
	defaultLocale: string
	locales: readonly string[]
	/**
	 * Loads one locale's dictionary, same as `localization.load`. Carried on the token so build tooling can preload dictionaries before evaluating lazy seo resolvers,
	 * without knowing the localization instance.
	 */
	load(locale: string): Promise<void>
	/**
	 * Runs one locale's dictionary loader and hands back its entries as written, without compiling them.
	 * Resolves `undefined` for the default locale, a locale without a loader, or a loader that fails.
	 * Carried on the token so build tooling can check dictionaries against the `text` call sites.
	 */
	readDictionary(locale: string): Promise<Dictionary | undefined>
}

/**
 * The route parameter produced by `configureLocalization`. A constant-values token keyed `'locale'`,
 * branded with the configured locales.
 */
export type LocaleParameter<TLocale extends string> = Parameter<'locale', Constant<TLocale>> & { [localeTokenBrand]: LocaleTokenInfo }

/** @internal Creates the branded locale token for a set of configured locales. */
export function createLocaleParameter<TLocale extends string>(
	defaultLocale: TLocale,
	locales: readonly TLocale[],
	load: LocaleTokenInfo['load'],
	readDictionary: LocaleTokenInfo['readDictionary'],
): LocaleParameter<TLocale> {
	const parameter = token('locale', locales as readonly TLocale[] as readonly [TLocale, ...TLocale[]])
	return Object.assign(parameter, {
		[localeTokenBrand]: { defaultLocale, locales, load, readDictionary } satisfies LocaleTokenInfo,
	}) as LocaleParameter<TLocale>
}
