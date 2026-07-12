import { href } from '@rooted/router'
import { isClient } from '@rooted/util'
import { isDevelopment } from '@rooted/util/dev'

import { compileDictionary, lookupKey, type CompiledEntry, type DictionaryLoader } from './dictionary.mts'
import { createDocumentObserver, type ObserveDocumentOptions } from './document.mts'
import { createLocaleParameter, type LocaleParameter } from './locale-token.mts'

/**
 * Options for {@link configureLocalization}.
 */
export type LocalizationOptions<TDefault extends string, TDictionaries extends Record<string, DictionaryLoader>> = {
	/**
	 * The locale of the inline text at `text` call sites, e.g. `'en-GB'`.
	 * The default locale needs no dictionary.
	 */
	default: TDefault
	/**
	 * Dictionary loaders keyed by locale. Write them as dynamic imports so
	 * each locale is bundled as its own chunk and only downloaded when a
	 * visitor actually uses that language:
	 *
	 * ```ts
	 * dictionaries: {
	 *   'nl-NL': () => import('./dictionaries/nl-NL.mts'),
	 * }
	 * ```
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
	/** The configured dictionary loaders, keyed by locale. */
	dictionaries: ReadonlyMap<TLocale, DictionaryLoader>
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
	 * Loads the dictionary chunk for a locale (the current URL's locale when
	 * omitted). Resolves immediately for the default locale, an already loaded
	 * dictionary, or a locale without a loader. Concurrent calls share one
	 * in-flight load.
	 *
	 * Navigation already starts the download in the background; awaiting this
	 * in a route resolver guarantees the first paint is translated:
	 *
	 * ```ts
	 * async resolve({ create }) {
	 *   await localization.load()
	 *   const { About } = await import('./about.mts')
	 *   return create(About)
	 * }
	 * ```
	 *
	 * A failed chunk load logs a warning and resolves anyway; `text` then
	 * falls back to the default-language text instead of breaking the page.
	 */
	load(locale?: TLocale): Promise<void>
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
	 * Keeps the live document's locale state current across navigations: the
	 * `lang` attribute on `<html>`, the `<link rel="alternate" hreflang>`
	 * links, and the `og:locale` meta tags. Returns a dispose function.
	 *
	 * This only affects the live document. Prerendered HTML gets the same
	 * treatment from the build plugin (`@rooted/localization/vite`); use both.
	 */
	observeDocument(options?: ObserveDocumentOptions): () => void
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
 * at the `text` call sites; every other locale gets an overlay dictionary,
 * loaded lazily as its own bundle chunk.
 *
 * The locale is expected as the first URL path segment (`/nl-NL/about/`).
 * Compose routes with {@link Localization.parameter} to get that for free,
 * including per-locale prerendering and sitemap entries.
 *
 * @example
 * ```ts
 * export const localization = configureLocalization({
 *   default: 'en-GB',
 *   dictionaries: {
 *     'nl-NL': () => import('./dictionaries/nl-NL.mts'),
 *   },
 * })
 * ```
 */
export function configureLocalization<
	const TDefault extends string,
	const TDictionaries extends Record<string, DictionaryLoader> = Record<never, DictionaryLoader>,
>(options: LocalizationOptions<TDefault, TDictionaries>): Localization<TDefault | (keyof TDictionaries & string)> {
	type TLocale = TDefault | (keyof TDictionaries & string)

	const defaultLocale = options.default as TLocale
	const dictionaries = new Map(Object.entries(options.dictionaries ?? {})) as ReadonlyMap<TLocale, DictionaryLoader>
	const supportedLocales = [
		defaultLocale,
		...([...dictionaries.keys()]).filter(locale => locale !== defaultLocale),
	] as readonly TLocale[]
	const compiled = new Map<TLocale, Map<string, CompiledEntry>>()
	const loading = new Map<TLocale, Promise<void>>()

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

	function load(locale?: TLocale): Promise<void> {
		const target = locale ?? currentLocale()
		if (compiled.has(target)) return Promise.resolve()

		const loader = dictionaries.get(target)
		if (!loader) return Promise.resolve()

		const inFlight = loading.get(target) ?? loader()
			.then(module => {
				compiled.set(target, compileDictionary(target, module.default))
			})
			.catch((error: unknown) => {
				console.warn(`[@rooted/localization] failed to load the "${target}" dictionary: ${String(error)}`)
			})
		loading.set(target, inFlight)
		return inFlight
	}

	// Start downloading the current locale's dictionary as soon as possible,
	// in parallel with whatever the navigation is loading. Route resolvers
	// still `await load()` for a guaranteed translated first paint.
	if (isClient()) {
		window.addEventListener('popstate', () => void load())
		void load()
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
			// Covers a missing entry and a dictionary that hasn't loaded yet
			return isDevelopment()
				? `[i18n missing ${locale}] ${renderDefault(strings, values)}`
				: renderDefault(strings, values)
		}

		const valueByName = new Map(entry.keyNames.map((name, index) => [name, values[index]]))
		let output = entry.value.parts[0]
		for (let index = 0; index < entry.value.names.length; index++) {
			// Unknown names render empty; compileDictionary already warned in dev
			const value = valueByName.get(entry.value.names[index])
			output += (value === undefined ? '' : String(value)) + entry.value.parts[index + 1]
		}
		return output
	}

	return {
		parameter: createLocaleParameter(defaultLocale, supportedLocales, locale => load(locale as TLocale)),
		supportedLocales,
		dictionaries,
		Locale: defaultLocale,
		get currentLocale() { return currentLocale() },
		route: {
			get rawValue() { return rawSegment() },
			get valid() { return isSupported(rawSegment()) },
			get invalid() { return !isSupported(rawSegment()) },
		},
		load,
		text,
		observeDocument: createDocumentObserver(supportedLocales, defaultLocale),
	}
}
