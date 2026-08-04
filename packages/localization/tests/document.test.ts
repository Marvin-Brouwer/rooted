import { describe, test, expect, afterEach } from 'vitest'

import { dictionary } from '../src/dictionary.mts'
import { configureLocalization } from '../src/localization.mts'

function visit(path: string) {
	history.pushState(undefined, '', path)
	globalThis.dispatchEvent(new PopStateEvent('popstate', { state: undefined }))
}

function alternateLinks() {
	return [...document.head.querySelectorAll('link[rel="alternate"]')]
		.map(link => ({ hreflang: link.getAttribute('hreflang'), href: link.getAttribute('href') }))
}

function ogLocales() {
	return [...document.head.querySelectorAll('meta[property^="og:locale"]')]
		.map(meta => ({ property: meta.getAttribute('property'), content: meta.getAttribute('content') }))
}

const localization = configureLocalization({
	default: 'en-GB',
	dictionaries: { 'nl-NL': () => Promise.resolve({ default: dictionary() }) },
})

let dispose: (() => void) | undefined

afterEach(() => {
	dispose?.()
	dispose = undefined
	visit('/')
})

describe('observeDocument()', () => {
	test('creates alternate links for a localized path', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeDocument()

		const links = alternateLinks()
		expect(links).toHaveLength(3)
		expect(links.find(l => l.hreflang === 'en-GB')?.href).toBe(`${location.origin}/en-GB/about/`)
		expect(links.find(l => l.hreflang === 'nl-NL')?.href).toBe(`${location.origin}/nl-NL/about/`)
		expect(links.find(l => l.hreflang === 'x-default')?.href).toBe(`${location.origin}/en-GB/about/`)
	})

	test('sets the html lang attribute to the current locale', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeDocument()

		expect(document.documentElement.lang).toBe('nl-NL')
	})

	test('sets og:locale and og:locale:alternate metas', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeDocument()

		const metas = ogLocales()
		expect(metas).toContainEqual({ property: 'og:locale', content: 'nl_NL' })
		expect(metas).toContainEqual({ property: 'og:locale:alternate', content: 'en_GB' })
	})

	test('updates everything on navigation', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeDocument()
		visit('/en-GB/contact/')

		expect(document.documentElement.lang).toBe('en-GB')
		expect(alternateLinks().find(l => l.hreflang === 'nl-NL')?.href).toBe(`${location.origin}/nl-NL/contact/`)
		expect(ogLocales()).toContainEqual({ property: 'og:locale', content: 'en_GB' })
		expect(ogLocales()).toContainEqual({ property: 'og:locale:alternate', content: 'nl_NL' })
	})

	test('falls back to the default locale on a non-localized path', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeDocument()
		visit('/plain/')

		expect(document.documentElement.lang).toBe('en-GB')
		expect(alternateLinks()).toHaveLength(0)
		expect(ogLocales()).toHaveLength(0)
	})

	test('uses the deploymentUrl when provided', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeDocument({ deploymentUrl: 'https://example.com/' })

		expect(alternateLinks().find(l => l.hreflang === 'nl-NL')?.href).toBe('https://example.com/nl-NL/about/')
	})

	test('dispose removes the managed tags and stops observing', () => {
		visit('/nl-NL/about/')
		const disposeNow = localization.observeDocument()
		disposeNow()

		expect(alternateLinks()).toHaveLength(0)
		expect(ogLocales()).toHaveLength(0)

		visit('/en-GB/about/')
		expect(alternateLinks()).toHaveLength(0)
	})
})
