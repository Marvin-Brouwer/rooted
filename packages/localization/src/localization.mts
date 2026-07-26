import { href } from '@rooted/router'
import { isClient } from '@rooted/util'
import { isDevelopment } from '@rooted/util/dev'

import { compileDictionary, lookupKey, type CompiledEntry, type DictionaryLoader } from './dictionary.mts'
import { createDocumentObserver, type ObserveDocumentOptions } from './document.mts'
import { createLocaleParameter, type LocaleParameter } from './locale-token.mts'
import { createLocalizedFactory, type LocalizedRender } from './localized.mts'

import type { GenericComponent } from '@rooted/components'

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
 * What {@link Localization.load} resolves to: the locale it loaded, and whether
 * the latest navigation changed the locale.
 *
 * `changed` belongs to the navigation rather than the call, so two callers
 * awaiting `load()` during the same navigation both see `true`.
 */
export type LocaleLoadResult<TLocale extends string> = [locale: TLocale, changed: boolean]

/**
 * Per-locale loaders for {@link Localization.branch}, one per configured locale.
 *
 * A mapped type over the locale union, so leaving a locale out is a compile
 * error and an unknown key is rejected.
 */
export type LocaleBranches<TLocale extends string, T> = { [K in TLocale]: () => Promise<T> }

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
	 * It also reports whether the latest navigation changed the locale, which
	 * is what you need to react to a locale switch without re-doing work on
	 * every navigation:
	 *
	 * ```ts
	 * on('window', 'popstate', async () => {
	 *   const [locale, changed] = await localization.load()
	 *   if (!changed) return
	 *   // the dictionary for `locale` is ready here
	 * })
	 * ```
	 *
	 * `changed` describes the navigation, not the call, so every caller during
	 * one navigation sees the same value. It's `false` on the first page load,
	 * since there's no previous navigation to differ from. For swapping DOM
	 * rather than running side effects, reach for {@link Localization.localized}
	 * instead.
	 *
	 * A failed chunk load logs a warning and resolves anyway; `text` then
	 * falls back to the default-language text instead of breaking the page.
	 */
	load(locale?: TLocale): Promise<LocaleLoadResult<TLocale>>
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
	 * Picks one of several per-locale loaders and runs only the matching one.
	 *
	 * For content that's too big or too structural for the dictionary: a whole
	 * page of prose, an image, a data file, or markup that genuinely differs per
	 * language. It's not a replacement for {@link Localization.text}, which stays
	 * the right tool for labels.
	 *
	 * You need one entry per configured locale; leaving one out is a compile
	 * error. Only the current locale's loader is ever called, so writing them as
	 * dynamic imports keeps each locale in its own chunk:
	 *
	 * ```ts
	 * const content = await localization.branch({
	 *   'en-GB': () => import('./about.en-GB.md'),
	 *   'nl-NL': () => import('./about.nl-NL.md'),
	 * })
	 * append(create(Markdown, { source: content }))
	 * ```
	 *
	 * The value is whatever the loader resolves to, untouched. A dynamic import
	 * resolves to the module, so reach for `.default` yourself when that's what
	 * you want: `(await import('./about.en-GB.md?raw')).default`.
	 *
	 * If the current locale has no entry at runtime (a version skew between the
	 * configured locales and this call site) it warns and falls back to the
	 * default locale, the same way `text` falls back to the default text.
	 */
	branch<T>(loaders: LocaleBranches<TLocale, T>): Promise<T>
	/**
	 * Wraps content that has to be rebuilt when the locale changes.
	 *
	 * Route components are already rebuilt by navigation, so they don't need
	 * this. It's for the parts that outlive a route: an app shell, a menu, a
	 * dialog mounted once at startup. The dictionary for the new locale is
	 * loaded before `render` runs, so `text` returns translations rather than
	 * falling back.
	 *
	 * ```ts
	 * append(
	 *   localization.localized(() => create(MenuContent, { onClose: () => dialog.close() })),
	 * )
	 * ```
	 *
	 * `render` runs on mount and again on every locale change, but not on
	 * navigations that keep the same locale. The listener is tied to the
	 * component, so unmounting cleans it up.
	 */
	localized(render: LocalizedRender<TLocale>): GenericComponent
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

	// The locale the latest navigation resolved to, and whether that navigation
	// changed it. Both are updated once per `popstate`, never per `load` call,
	// so every caller within one navigation gets the same answer.
	let navigationLocale = isClient() ? currentLocale() : defaultLocale
	let localeChanged = false

	function load(locale?: TLocale): Promise<LocaleLoadResult<TLocale>> {
		const target = locale ?? currentLocale()
		// Captured now rather than after awaiting, so the answer describes the
		// navigation this call belongs to even if another one lands meanwhile.
		const result: LocaleLoadResult<TLocale> = [target, localeChanged && target === navigationLocale]
		if (compiled.has(target)) return Promise.resolve(result)

		const loader = dictionaries.get(target)
		if (!loader) return Promise.resolve(result)

		const inFlight = loading.get(target) ?? loader()
			.then(module => {
				compiled.set(target, compileDictionary(target, module.default))
			})
			.catch((error: unknown) => {
				console.warn(`[@rooted/localization] failed to load the "${target}" dictionary: ${String(error)}`)
			})
		loading.set(target, inFlight)
		return inFlight.then(() => result)
	}

	// Start downloading the current locale's dictionary as soon as possible,
	// in parallel with whatever the navigation is loading. Route resolvers
	// still `await load()` for a guaranteed translated first paint.
	if (isClient()) {
		window.addEventListener('popstate', () => {
			const next = currentLocale()
			localeChanged = next !== navigationLocale
			navigationLocale = next
			void load()
		})
		void load()
	}

	function branch<T>(loaders: LocaleBranches<TLocale, T>): Promise<T> {
		const locale = currentLocale()
		const loader = loaders[locale]
		if (typeof loader === 'function') return loader()

		// Only reachable when the configured locales and this call site disagree
		console.warn(`[@rooted/localization] no "${locale}" branch, falling back to "${defaultLocale}"`)
		const fallback = loaders[defaultLocale]
		if (typeof fallback === 'function') return fallback()
		return Promise.reject(new Error(`[@rooted/localization] no branch for "${locale}" or "${defaultLocale}"`))
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
		parameter: createLocaleParameter(defaultLocale, supportedLocales, async locale => void await load(locale as TLocale)),
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
		branch,
		localized: createLocalizedFactory(() => load()),
		observeDocument: createDocumentObserver(supportedLocales, defaultLocale),
	}
}
