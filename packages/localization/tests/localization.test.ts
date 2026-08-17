import { describe, test, expect, vi, afterEach } from 'vitest'

import { route } from '@rooted/router/routes'

import { dictionary, translation, type DictionaryModule } from '../src/dictionary.mts'
import { localeTokenBrand } from '../src/locale-token.mts'
import { configureLocalization } from '../src/localization.mts'

function visit(path: string) {
	history.pushState(undefined, '', path)
}

/** `visit` plus the `popstate` the router dispatches, so navigation bookkeeping runs. */
function navigate(path: string) {
	visit(path)
	globalThis.dispatchEvent(new PopStateEvent('popstate', { state: undefined }))
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
		// Act
		const localization = configure()

		// Assert
		expect(localization.supportedLocales).toEqual(['en-GB', 'nl-NL'])
	})

	test('the default locale is not duplicated when it has a dictionary', () => {
		// Act
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'en-GB': loader({ default: dictionary() }), 'nl-NL': loader({ default: dictionary() }) },
		})

		// Assert
		expect(localization.supportedLocales).toEqual(['en-GB', 'nl-NL'])
	})

	test('dictionaries exposes the configured loaders keyed by locale', () => {
		// Act
		const localization = configure()

		// Assert
		expect(localization.dictionaries).toBeInstanceOf(Map)
		expect(localization.dictionaries.get('nl-NL')).toBeTypeOf('function')
	})

	test('Locale carries the default locale at runtime', () => {
		// Act
		const localization = configure()

		// Assert
		expect(localization.Locale).toBe('en-GB')
	})

	test('parameter is keyed "locale"', () => {
		// Act
		const localization = configure()

		// Assert
		expect(localization.parameter.key).toBe('locale')
	})

	test('parameter carries the locale brand payload', () => {
		// Arrange
		const localization = configure()

		// Act
		const info = localization.parameter[localeTokenBrand]

		// Assert
		expect(info.defaultLocale).toBe('en-GB')
		expect(info.locales).toEqual(['en-GB', 'nl-NL'])
		expect(info.load).toBeTypeOf('function')
	})

	test('the brand payload load reaches the dictionary loader', async () => {
		// Arrange
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})

		// Act
		await localization.parameter[localeTokenBrand].load('nl-NL')

		// Assert
		expect(nlLoader).toHaveBeenCalledOnce()
	})

	test('parameter matches configured locales in a route', async () => {
		// Arrange
		const localization = configure()
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await aboutRoute.match({ target: '/nl-NL/about/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.locale).toBe('nl-NL')
	})

	test('parameter rejects unknown locales in a route', async () => {
		// Arrange
		const localization = configure()
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await aboutRoute.match({ target: '/de-DE/about/' })

		// Assert
		expect(match.success).toBe(false)
	})

	test('routes with the parameter unroll to per-locale static paths', () => {
		// Arrange
		const localization = configure()
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const metadata = aboutRoute.getMetadata()

		// Assert
		expect(metadata.staticPaths).toEqual(['/en-GB/about/', '/nl-NL/about/'])
	})
})

describe('currentLocale', () => {
	test('reads the locale from the first path segment', () => {
		// Arrange
		const localization = configure()

		// Act
		visit('/nl-NL/about/')

		// Assert
		expect(localization.currentLocale).toBe('nl-NL')
	})

	test('falls back to the default for unknown locales', () => {
		// Arrange
		const localization = configure()

		// Act
		visit('/de-DE/about/')

		// Assert
		expect(localization.currentLocale).toBe('en-GB')
	})

	test('falls back to the default at the root', () => {
		// Arrange
		const localization = configure()

		// Act
		visit('/')

		// Assert
		expect(localization.currentLocale).toBe('en-GB')
	})
})

describe('route helpers', () => {
	test('rawValue exposes the first segment regardless of validity', () => {
		// Arrange
		const localization = configure()

		// Act
		visit('/de-DE/about/')

		// Assert
		expect(localization.route.rawValue).toBe('de-DE')
	})

	test('rawValue is undefined at the root', () => {
		// Arrange
		const localization = configure()

		// Act
		visit('/')

		// Assert
		expect(localization.route.rawValue).toBeUndefined()
	})

	test('valid for a configured locale', () => {
		// Arrange
		const localization = configure()

		// Act
		visit('/nl-NL/about/')

		// Assert
		expect(localization.route.valid).toBe(true)
		expect(localization.route.invalid).toBe(false)
	})

	test('invalid for an unknown locale', () => {
		// Arrange
		const localization = configure()

		// Act
		visit('/de-DE/about/')

		// Assert
		expect(localization.route.valid).toBe(false)
		expect(localization.route.invalid).toBe(true)
	})

	test('invalid at the root', () => {
		// Arrange
		const localization = configure()

		// Act
		visit('/')

		// Assert
		expect(localization.route.invalid).toBe(true)
	})
})

describe('load', () => {
	test('resolves without calling anything for the default locale', async () => {
		// Arrange
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/en-GB/greeting/')

		// Act
		await localization.load()

		// Assert
		expect(nlLoader).not.toHaveBeenCalled()
	})

	test('loads the current locale by default', async () => {
		// Arrange
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/nl-NL/greeting/')

		// Act
		await localization.load()

		// Assert
		expect(nlLoader).toHaveBeenCalledOnce()
	})

	test('loads an explicit locale', async () => {
		// Arrange
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/')

		// Act
		await localization.load('nl-NL')

		// Assert
		expect(nlLoader).toHaveBeenCalledOnce()
	})

	test('concurrent and repeated loads call the loader once', async () => {
		// Arrange
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/nl-NL/greeting/')

		// Act
		await Promise.all([localization.load(), localization.load(), localization.load()])
		await localization.load()

		// Assert
		expect(nlLoader).toHaveBeenCalledOnce()
	})

	test('a failing loader warns and resolves', async () => {
		// Arrange
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': () => Promise.reject(new Error('chunk gone')) },
		})
		visit('/nl-NL/greeting/')

		// Act
		const loading = localization.load()

		// Assert
		await expect(loading).resolves.toEqual(['nl-NL', false])
		expect(warn).toHaveBeenCalledOnce()
		expect(warn.mock.calls[0][0]).toContain('nl-NL')
		// text falls back to the default text (with the dev marker)
		expect(localization.text`unknown label`).toBe('[i18n missing nl-NL] unknown label')
	})

	test('a failed load is retried on the next call', async () => {
		// Arrange
		vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		const nlLoader = vi.fn()
			.mockImplementationOnce(() => Promise.reject(new Error('chunk gone')))
			.mockImplementationOnce(() => Promise.resolve(nlNL))
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		visit('/nl-NL/greeting/')
		await localization.load()

		// Act
		await localization.load()

		// Assert: a flaky chunk must not degrade the locale for the whole session
		expect(nlLoader).toHaveBeenCalledTimes(2)
		expect(localization.text`this is an example label`).toBe('dit is een voorbeeld label')
	})

	test('navigation auto-starts the load', async () => {
		// Arrange
		const nlLoader = loader(nlNL)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})

		// Act
		visit('/nl-NL/greeting/')
		globalThis.dispatchEvent(new PopStateEvent('popstate', { state: undefined }))
		await vi.waitFor(() => expect(nlLoader).toHaveBeenCalled())
		await new Promise(resolve => setTimeout(resolve))

		// Assert
		expect(localization.text`this is an example label`).toBe('dit is een voorbeeld label')
	})
})

describe('load result', () => {
	test('reports the loaded locale and no change on first load', async () => {
		// Arrange
		const localization = configure()
		visit('/nl-NL/greeting/')

		// Act
		const result = await localization.load()

		// Assert
		expect(result).toEqual(['nl-NL', false])
	})

	test('reports the locale change after navigating to another locale', async () => {
		// Arrange
		const localization = configure()

		// Act
		navigate('/nl-NL/greeting/')
		const result = await localization.load()

		// Assert
		expect(result).toEqual(['nl-NL', true])
	})

	test('every caller in one navigation sees the same change flag', async () => {
		// Arrange
		const localization = configure()
		navigate('/nl-NL/greeting/')

		// Act: the internal preload already ran, and none of these may consume the flag
		const [first, second] = await Promise.all([localization.load(), localization.load()])
		const third = await localization.load()

		// Assert
		expect(first).toEqual(['nl-NL', true])
		expect(second).toEqual(['nl-NL', true])
		expect(third).toEqual(['nl-NL', true])
	})

	test('reports no change when navigating within the same locale', async () => {
		// Arrange
		const localization = configure()
		navigate('/nl-NL/greeting/')

		// Act
		navigate('/nl-NL/about/')
		const result = await localization.load()

		// Assert
		expect(result).toEqual(['nl-NL', false])
	})

	test('reports the change again when navigating back to the default locale', async () => {
		// Arrange
		const localization = configure()
		navigate('/nl-NL/greeting/')

		// Act
		navigate('/en-GB/greeting/')
		const result = await localization.load()

		// Assert
		expect(result).toEqual(['en-GB', true])
	})

	test('an explicit locale that is not the navigated one never reports a change', async () => {
		// Arrange
		const localization = configure()
		navigate('/nl-NL/greeting/')

		// Act
		const result = await localization.load('en-GB')

		// Assert
		expect(result).toEqual(['en-GB', false])
	})

	test('a popstate listener registered after configure sees the change', async () => {
		// Arrange
		const localization = configure()
		const seen: Array<[string, boolean]> = []
		globalThis.addEventListener('popstate', () => {
			void localization.load().then(result => void seen.push(result))
		})

		// Act
		navigate('/nl-NL/greeting/')
		await vi.waitFor(() => expect(seen).toHaveLength(1))

		// Assert
		expect(seen[0]).toEqual(['nl-NL', true])
		// The dictionary is ready by the time the handler's await resolves
		expect(localization.text`this is an example label`).toBe('dit is een voorbeeld label')
	})
})

describe('branch', () => {
	test('runs only the current locale\'s loader', async () => {
		// Arrange
		const localization = configure()
		visit('/nl-NL/about/')
		const en = vi.fn(() => Promise.resolve('english'))
		const nl = vi.fn(() => Promise.resolve('dutch'))

		// Act
		const result = await localization.branch({ 'en-GB': en, 'nl-NL': nl })

		// Assert
		expect(result).toBe('dutch')
		expect(nl).toHaveBeenCalledOnce()
		expect(en).not.toHaveBeenCalled()
	})

	test('uses the default locale loader at the root', async () => {
		// Arrange
		const localization = configure()
		visit('/')
		const en = vi.fn(() => Promise.resolve('english'))
		const nl = vi.fn(() => Promise.resolve('dutch'))

		// Act
		const result = await localization.branch({ 'en-GB': en, 'nl-NL': nl })

		// Assert
		expect(result).toBe('english')
		expect(nl).not.toHaveBeenCalled()
	})

	test('passes the loaded value through untouched', async () => {
		// Arrange
		const localization = configure()
		visit('/')
		const module = { default: 'raw markdown' }

		// Act
		const result = await localization.branch({
			'en-GB': () => Promise.resolve(module),
			'nl-NL': () => Promise.resolve(module),
		})

		// Assert
		expect(result).toBe(module)
	})

	test('falls back to the default locale and warns when the entry is missing', async () => {
		// Arrange: a version skew, where the type says nl-NL is present but the
		// runtime object disagrees
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		const localization = configure()
		visit('/nl-NL/about/')
		const en = vi.fn(() => Promise.resolve('english'))
		const loaders = { 'en-GB': en } as unknown as Record<'en-GB' | 'nl-NL', () => Promise<string>>

		// Act
		const result = await localization.branch(loaders)

		// Assert
		expect(result).toBe('english')
		expect(en).toHaveBeenCalledOnce()
		expect(warn).toHaveBeenCalledOnce()
		expect(warn.mock.calls[0][0]).toContain('nl-NL')
	})

	test('rejects when neither the current nor the default locale has an entry', async () => {
		// Arrange
		vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		const localization = configure()
		visit('/nl-NL/about/')
		const loaders = {} as unknown as Record<'en-GB' | 'nl-NL', () => Promise<string>>

		// Act
		const branching = localization.branch(loaders)

		// Assert
		await expect(branching).rejects.toThrow('no branch for "nl-NL" or "en-GB"')
	})
})

describe('text', () => {
	test('default locale renders the inline text', () => {
		// Arrange
		const localization = configure()
		visit('/en-GB/greeting/')

		// Act
		const rendered = localization.text`this is an example label`

		// Assert
		expect(rendered).toBe('this is an example label')
	})

	test('translated locale renders the dictionary value once loaded', async () => {
		// Arrange
		const localization = configure()
		visit('/nl-NL/greeting/')
		await localization.load()

		// Act
		const rendered = localization.text`this is an example label`

		// Assert
		expect(rendered).toBe('dit is een voorbeeld label')
	})

	test('before the dictionary loads, the default text renders with the dev marker', () => {
		// Arrange
		const localization = configure()
		visit('/nl-NL/greeting/')

		// Act
		const rendered = localization.text`this is an example label`

		// Assert
		expect(rendered).toBe('[i18n missing nl-NL] this is an example label')
	})

	test('interpolated values are re-mapped by name, allowing reordering', async () => {
		// Arrange
		const localization = configure()
		visit('/nl-NL/greeting/')
		await localization.load()

		// Act
		const rendered = localization.text`hello ${'Jansen'}, ${'Sanne'}`

		// Assert
		expect(rendered).toBe('hallo Sanne Jansen')
	})

	test('default locale interpolation renders positionally', () => {
		// Arrange
		const localization = configure()
		visit('/en-GB/greeting/')

		// Act
		const rendered = localization.text`hello ${'Jansen'}, ${'Sanne'}`

		// Assert
		expect(rendered).toBe('hello Jansen, Sanne')
	})

	test('missing translation shows the dev marker', async () => {
		// Arrange
		const localization = configure()
		visit('/nl-NL/greeting/')
		await localization.load()

		// Act
		const rendered = localization.text`unknown label`

		// Assert
		expect(rendered).toBe('[i18n missing nl-NL] unknown label')
	})

	test('missing translation falls back silently in production', async () => {
		// Arrange
		vi.stubEnv('DEV', false)
		const localization = configure()
		visit('/nl-NL/greeting/')
		await localization.load()

		// Act
		const rendered = localization.text`unknown label`

		// Assert
		expect(rendered).toBe('unknown label')
	})

	test('a translation referencing an unknown parameter renders it empty and warns on load', async () => {
		// Arrange
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: {
				'nl-NL': () => Promise.resolve({ default: dictionary(translation('hi {name}', 'hoi {typo}')) }),
			},
		})
		visit('/nl-NL/greeting/')

		// Act
		await localization.load()

		// Assert
		expect(warn).toHaveBeenCalledOnce()
		expect(localization.text`hi ${'Sanne'}`).toBe('hoi ')
	})
})
