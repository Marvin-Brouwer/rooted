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
		// Arrange
		visit('/nl-NL/about/')
		dispose = localization.observeDocument()

		// Act

		const links = alternateLinks()

		// Assert
		expect(links).toHaveLength(3)
		expect(links.find(l => l.hreflang === 'en-GB')?.href).toBe(`${location.origin}/en-GB/about/`)
		expect(links.find(l => l.hreflang === 'nl-NL')?.href).toBe(`${location.origin}/nl-NL/about/`)
		expect(links.find(l => l.hreflang === 'x-default')?.href).toBe(`${location.origin}/en-GB/about/`)
	})

	test('sets the html lang attribute to the current locale', () => {
		// Arrange
		visit('/nl-NL/about/')

		// Act
		dispose = localization.observeDocument()

		// Assert

		expect(document.documentElement.lang).toBe('nl-NL')
	})

	test('sets og:locale and og:locale:alternate metas', () => {
		// Arrange
		visit('/nl-NL/about/')
		dispose = localization.observeDocument()

		// Act

		const metas = ogLocales()

		// Assert
		expect(metas).toContainEqual({ property: 'og:locale', content: 'nl_NL' })
		expect(metas).toContainEqual({ property: 'og:locale:alternate', content: 'en_GB' })
	})

	test('updates everything on navigation', () => {
		// Arrange
		visit('/nl-NL/about/')
		dispose = localization.observeDocument()

		// Act
		visit('/en-GB/contact/')

		// Assert

		expect(document.documentElement.lang).toBe('en-GB')
		expect(alternateLinks().find(l => l.hreflang === 'nl-NL')?.href).toBe(`${location.origin}/nl-NL/contact/`)
		expect(ogLocales()).toContainEqual({ property: 'og:locale', content: 'en_GB' })
		expect(ogLocales()).toContainEqual({ property: 'og:locale:alternate', content: 'nl_NL' })
	})

	test('falls back to the default locale on a non-localized path', () => {
		// Arrange
		visit('/nl-NL/about/')
		dispose = localization.observeDocument()

		// Act
		visit('/plain/')

		// Assert

		expect(document.documentElement.lang).toBe('en-GB')
		expect(alternateLinks()).toHaveLength(0)
		expect(ogLocales()).toHaveLength(0)
	})

	test('uses the deploymentUrl when provided', () => {
		// Arrange
		visit('/nl-NL/about/')

		// Act
		dispose = localization.observeDocument({ deploymentUrl: 'https://example.com/' })

		// Assert

		expect(alternateLinks().find(l => l.hreflang === 'nl-NL')?.href).toBe('https://example.com/nl-NL/about/')
	})

	test('dispose removes the managed tags and stops observing', () => {
		// Arrange
		visit('/nl-NL/about/')
		const disposeNow = localization.observeDocument()

		// Act
		disposeNow()

		// Assert
		expect(alternateLinks()).toHaveLength(0)
		expect(ogLocales()).toHaveLength(0)
		// A later navigation must not bring the tags back
		visit('/en-GB/about/')
		expect(alternateLinks()).toHaveLength(0)
	})
})
