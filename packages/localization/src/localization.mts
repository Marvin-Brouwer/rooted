import { href } from '@rooted/router'
import { isClient } from '@rooted/util'
import { isDevelopment } from '@rooted/util/dev'

import { compileDictionaries, lookupKey, type Dictionary, type Translation } from './dictionary.mts'
import { createHreflangObserver, type ObserveHreflangOptions } from './hreflang.mts'
import { createLocaleParameter, type LocaleParameter } from './locale-token.mts'

/**
 * Options for {@link configureLocalization}.
 */
export type LocalizationOptions<TDefault extends string, TDictionaries extends readonly Dictionary[]> = {
	/**
	 * The locale of the inline text at `text` call sites, e.g. `'en-GB'`.
	 * The default locale needs no dictionary.
	 */
	default: TDefault
	/**
	 * Overlay dictionaries, one {@link dictionary} per locale:
	 * `dictionaries: [nlNL, deDE]`.
	 */
	dictionaries?: TDictionaries
}

/**
 * URL-derived locale helpers for route resolvers.
 *
 * All three read the first path segment of the current URL. Handy for
 * routes that take the locale as a plain `String` token, or for showing
 * what an invalid URL actually contained. Routes using
 * {@link Localization.parameter} don't need `valid`: the token itself only
 * matches configured locales.
 */
export type LocalizationRoute = {
	/** The raw first path segment, regardless of validity. `undefined` at the root. */
	readonly rawValue: string | undefined
	/** `true` when the first path segment is a configured locale. */
	readonly valid: boolean
	/** `true` when the first path segment is missing or not a configured locale. */
	readonly invalid: boolean
}

/**
 * The configured localization instance returned by {@link configureLocalization}.
 */
export type Localization<TLocale extends string> = {
	/**
	 * Constant-values route token for the locale URL segment. Only matches
	 * configured locales, so URLs with an unknown locale simply don't match.
	 *
	 * ```ts
	 * export const AboutRoute = route`/${localization.parameter}/about/`({
	 *   resolve: ({ create, tokens }) => create(About, { locale: tokens.locale })
	 * })
	 * ```
	 */
	parameter: LocaleParameter<TLocale>
	/** All configured locales: the default plus the dictionary locales. */
	supportedLocales: readonly TLocale[]
	/** The configured overlay dictionaries, keyed by locale. */
	dictionaries: ReadonlyMap<TLocale, readonly Translation[]>
	/**
	 * Type carrier for the configured locale union. Reference it as
	 * `typeof localization.Locale` wherever code takes a locale:
	 *
	 * ```ts
	 * type GreetingOptions = { locale: typeof localization.Locale }
	 * ```
	 *
	 * At runtime this is just the default locale; its only job is carrying
	 * the type.
	 */
	readonly Locale: TLocale
	/**
	 * The locale parsed from the first path segment of the current URL.
	 * Falls back to the default locale, so it's always usable in components.
	 * Check {@link LocalizationRoute.valid} when you need to know whether the
	 * URL actually carried a locale.
	 */
	readonly currentLocale: TLocale
	/** URL-derived locale validity helpers. */
	route: LocalizationRoute
	/**
	 * Tagged template that translates through the current locale's dictionary.
	 *
	 * The template text itself is the default-locale text and doubles as the
	 * dictionary key. Missing translations fall back to the default text; in
	 * development they're prefixed with `[i18n missing {locale}]` so they're
	 * easy to spot.
	 *
	 * ```ts
	 * localization.text`hello ${lastName}, ${firstName}`
	 * ```
	 */
	text(strings: TemplateStringsArray, ...values: unknown[]): string
	/**
	 * Keeps `<link rel="alternate" hreflang>` tags in `document.head` current
	 * across navigations. Returns a dispose function.
	 *
	 * This only affects the live document. Prerendered HTML gets its hreflang
	 * tags from the build plugin (`@rooted/localization/vite`); use both.
	 */
	observeHreflang(options?: ObserveHreflangOptions): () => void
}

/**
 * Extracts the locale union from a configured {@link Localization} instance.
 *
 * @example
 * ```ts
 * type Locale = SupportedLocales<typeof localization>  // 'en-GB' | 'nl-NL'
 * ```
 */
export type SupportedLocales<T> = T extends Localization<infer L> ? L : never

/**
 * Configures localization for an app. The default locale's text lives inline
 * at the `text` call sites; every other locale gets an overlay dictionary.
 *
 * The locale is expected as the first URL path segment (`/nl-NL/about/`).
 * Compose routes with {@link Localization.parameter} to get that for free,
 * including per-locale prerendering and sitemap entries.
 *
 * @example
 * ```ts
 * import nlNL from './dictionaries/nl-NL.mts'
 *
 * export const localization = configureLocalization({
 *   default: 'en-GB',
 *   dictionaries: [nlNL],
 * })
 * ```
 */
export function configureLocalization<
	const TDefault extends string,
	const TDictionaries extends readonly Dictionary[] = readonly [],
>(options: LocalizationOptions<TDefault, TDictionaries>): Localization<TDefault | TDictionaries[number][0]> {
	type TLocale = TDefault | TDictionaries[number][0]

	const defaultLocale = options.default as TLocale
	const dictionaryEntries: readonly Dictionary[] = options.dictionaries ?? []
	const dictionaries = new Map(dictionaryEntries) as ReadonlyMap<TLocale, readonly Translation[]>
	const supportedLocales = [
		defaultLocale,
		...([...dictionaries.keys()]).filter(locale => locale !== defaultLocale),
	] as readonly TLocale[]
	const compiled = compileDictionaries(dictionaryEntries)

	function rawSegment(): string | undefined {
		if (!isClient()) return undefined
		const segment = href.current().pathOnly.split('/')[1]
		return segment === '' ? undefined : segment
	}

	function isSupported(segment: string | undefined): segment is TLocale {
		return segment !== undefined && (supportedLocales as readonly string[]).includes(segment)
	}

	function currentLocale(): TLocale {
		const segment = rawSegment()
		return isSupported(segment) ? segment : defaultLocale
	}

	function renderDefault(strings: TemplateStringsArray, values: unknown[]): string {
		// eslint-disable-next-line unicorn/no-array-reduce
		return [...strings].reduce((accumulator, part, index) =>
			index === 0 ? part : accumulator + String(values[index - 1]) + part, '')
	}

	function text(strings: TemplateStringsArray, ...values: unknown[]): string {
		const locale = currentLocale()
		if (locale === defaultLocale) return renderDefault(strings, values)

		const entry = compiled.get(locale)?.get(lookupKey(strings))
		if (!entry) {
			return isDevelopment()
				? `[i18n missing ${locale}] ${renderDefault(strings, values)}`
				: renderDefault(strings, values)
		}

		const valueByName = new Map(entry.keyNames.map((name, index) => [name, values[index]]))
		let output = entry.value.parts[0]
		for (let index = 0; index < entry.value.names.length; index++) {
			// Unknown names render empty; compileDictionaries already warned in dev
			const value = valueByName.get(entry.value.names[index])
			output += (value === undefined ? '' : String(value)) + entry.value.parts[index + 1]
		}
		return output
	}

	return {
		parameter: createLocaleParameter(defaultLocale, supportedLocales),
		supportedLocales,
		dictionaries,
		Locale: defaultLocale,
		get currentLocale() { return currentLocale() },
		route: {
			get rawValue() { return rawSegment() },
			get valid() { return isSupported(rawSegment()) },
			get invalid() { return !isSupported(rawSegment()) },
		},
		text,
		observeHreflang: createHreflangObserver(supportedLocales, defaultLocale),
	}
}
