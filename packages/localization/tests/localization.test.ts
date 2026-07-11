import { describe, test, expect, vi, afterEach } from 'vitest'

import { route } from '@rooted/router/routes'

import { dictionary, translation, type DictionaryModule } from '../src/dictionary.mts'
import { localeTokenBrand } from '../src/locale-token.mts'
import { configureLocalization } from '../src/localization.mts'

function visit(path: string) {
	history.pushState(undefined, '', path)
}

function loader(module: DictionaryModule) {
	return vi.fn(() => Promise.resolve(module))
}

const nlNL = {
	default: dictionary(
		translation('this is an example label', 'dit is een voorbeeld label'),
		translation('hello {lastName}, {firstName}', 'hallo {firstName} {lastName}'),
	),
}

function configure() {
	return configureLocalization({
		default: 'en-GB',
		dictionaries: {
			'nl-NL': loader(nlNL),
		},
	})
}

afterEach(() => {
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
	visit('/')
})

describe('configureLocalization()', () => {
	test('supportedLocales is the default plus the dictionary locales', () => {
		expect(configure().supportedLocales).toEqual(['en-GB', 'nl-NL'])
	})

	test('the default locale is not duplicated when it has a dictionary', () => {
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'en-GB': loader({ default: dictionary() }), 'nl-NL': loader({ default: dictionary() }) },
		})
		expect(localization.supportedLocales).toEqual(['en-GB', 'nl-NL'])
	})

	test('dictionaries exposes the configured loaders keyed by locale', () => {
		const localization = configure()
		expect(localization.dictionaries).toBeInstanceOf(Map)
		expect(localization.dictionaries.get('nl-NL')).toBeTypeOf('function')
	})

	test('Locale carries the default locale at runtime', () => {
		expect(configure().Locale).toBe('en-GB')
	})

	test('parameter is keyed "locale"', () => {
		expect(configure().parameter.key).toBe('locale')
	})

	test('parameter carries the locale brand payload', () => {
		const localization = configure()
		expect(localization.parameter[localeTokenBrand]).toEqual({
			defaultLocale: 'en-GB',
			locales: ['en-GB', 'nl-NL'],
		})
	})

	test('parameter matches configured locales in a route', async () => {
		const localization = configure()
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		const match = await aboutRoute.match({ target: '/nl-NL/about/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.locale).toBe('nl-NL')
	})

	test('parameter rejects unknown locales in a route', async () => {
		const localization = configure()
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		expect((await aboutRoute.match({ target: '/de-DE/about/' })).success).toBe(false)
	})

	test('routes with the parameter unroll to per-locale static paths', () => {
		const localization = configure()
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		expect(aboutRoute.getMetadata().staticPaths).toEqual(['/en-GB/about/', '/nl-NL/about/'])
	})
})

describe('currentLocale', () => {
	test('reads the locale from the first path segment', () => {
		const localization = configure()
		visit('/nl-NL/about/')
		expect(localization.currentLocale).toBe('nl-NL')
	})

	test('falls back to the default for unknown locales', () => {
		const localization = configure()
		visit('/de-DE/about/')
		expect(localization.currentLocale).toBe('en-GB')
	})

	test('falls back to the default at the root', () => {
		const localization = configure()
		visit('/')
		expect(localization.currentLocale).toBe('en-GB')
	})
})

describe('route helpers', () => {
	test('rawValue exposes the first segment regardless of validity', () => {
		const localization = configure()
		visit('/de-DE/about/')
		expect(localization.route.rawValue).toBe('de-DE')
	})

	test('rawValue is undefined at the root', () => {
		const localization = configure()
		visit('/')
		expect(localization.route.rawValue).toBeUndefined()
	})

	test('valid for a configured locale', () => {
		const localization = configure()
		visit('/nl-NL/about/')
		expect(localization.route.valid).toBe(true)
		expect(localization.route.invalid).toBe(false)
	})

	test('invalid for an unknown locale', () => {
		const localization = configure()
		visit('/de-DE/about/')
		expect(localization.route.valid).toBe(false)
		expect(localization.route.invalid).toBe(true)
	})

	test('invalid at the root', () => {
		const localization = configure()
		visit('/')
		expect(localization.route.invalid).toBe(true)
	})
})

describe('load', () => {
	test('resolves without calling anything for the default locale', async () => {
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/en-GB/greeting/')
		await localization.load()
		expect(nlLoader).not.toHaveBeenCalled()
	})

	test('loads the current locale by default', async () => {
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/nl-NL/greeting/')
		await localization.load()
		expect(nlLoader).toHaveBeenCalledOnce()
	})

	test('loads an explicit locale', async () => {
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/')
		await localization.load('nl-NL')
		expect(nlLoader).toHaveBeenCalledOnce()
	})

	test('concurrent and repeated loads call the loader once', async () => {
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/nl-NL/greeting/')
		await Promise.all([localization.load(), localization.load(), localization.load()])
		await localization.load()
		expect(nlLoader).toHaveBeenCalledOnce()
	})

	test('a failing loader warns and resolves', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': () => Promise.reject(new Error('chunk gone')) },
		})
		visit('/nl-NL/greeting/')
		await expect(localization.load()).resolves.toBeUndefined()
		expect(warn).toHaveBeenCalledOnce()
		expect(warn.mock.calls[0][0]).toContain('nl-NL')
		// text falls back to the default text (with the dev marker)
		expect(localization.text`unknown label`).toBe('[i18n missing nl-NL] unknown label')
	})

	test('navigation auto-starts the load', async () => {
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/nl-NL/greeting/')
		globalThis.dispatchEvent(new PopStateEvent('popstate', { state: undefined }))
		await vi.waitFor(() => expect(nlLoader).toHaveBeenCalled())
		await new Promise(resolve => setTimeout(resolve))
		expect(localization.text`this is an example label`).toBe('dit is een voorbeeld label')
	})
})

describe('text', () => {
	test('default locale renders the inline text', () => {
		const localization = configure()
		visit('/en-GB/greeting/')
		expect(localization.text`this is an example label`).toBe('this is an example label')
	})

	test('translated locale renders the dictionary value once loaded', async () => {
		const localization = configure()
		visit('/nl-NL/greeting/')
		await localization.load()
		expect(localization.text`this is an example label`).toBe('dit is een voorbeeld label')
	})

	test('before the dictionary loads, the default text renders with the dev marker', () => {
		const localization = configure()
		visit('/nl-NL/greeting/')
		expect(localization.text`this is an example label`).toBe('[i18n missing nl-NL] this is an example label')
	})

	test('interpolated values are re-mapped by name, allowing reordering', async () => {
		const localization = configure()
		visit('/nl-NL/greeting/')
		await localization.load()
		expect(localization.text`hello ${'Brouwer'}, ${'Marvin'}`).toBe('hallo Marvin Brouwer')
	})

	test('default locale interpolation renders positionally', () => {
		const localization = configure()
		visit('/en-GB/greeting/')
		expect(localization.text`hello ${'Brouwer'}, ${'Marvin'}`).toBe('hello Brouwer, Marvin')
	})

	test('missing translation shows the dev marker', async () => {
		const localization = configure()
		visit('/nl-NL/greeting/')
		await localization.load()
		expect(localization.text`unknown label`).toBe('[i18n missing nl-NL] unknown label')
	})

	test('missing translation falls back silently in production', async () => {
		vi.stubEnv('DEV', false)
		const localization = configure()
		visit('/nl-NL/greeting/')
		await localization.load()
		expect(localization.text`unknown label`).toBe('unknown label')
	})

	test('a translation referencing an unknown parameter renders it empty and warns on load', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: {
				'nl-NL': () => Promise.resolve({ default: dictionary(translation('hi {name}', 'hoi {typo}')) }),
			},
		})
		visit('/nl-NL/greeting/')
		await localization.load()
		expect(warn).toHaveBeenCalledOnce()
		expect(localization.text`hi ${'Marvin'}`).toBe('hoi ')
	})
})
