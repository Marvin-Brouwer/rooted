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

const localization = configureLocalization({
	default: 'en-GB',
	dictionaries: [dictionary('nl-NL', [])],
})

let dispose: (() => void) | undefined

afterEach(() => {
	dispose?.()
	dispose = undefined
	visit('/')
})

describe('observeHreflang()', () => {
	test('creates alternate links for a localized path', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeHreflang()

		const links = alternateLinks()
		expect(links).toHaveLength(3)
		expect(links.find(l => l.hreflang === 'en-GB')?.href).toBe(`${location.origin}/en-GB/about/`)
		expect(links.find(l => l.hreflang === 'nl-NL')?.href).toBe(`${location.origin}/nl-NL/about/`)
		expect(links.find(l => l.hreflang === 'x-default')?.href).toBe(`${location.origin}/en-GB/about/`)
	})

	test('updates the links on navigation', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeHreflang()
		visit('/en-GB/contact/')

		const links = alternateLinks()
		expect(links.find(l => l.hreflang === 'nl-NL')?.href).toBe(`${location.origin}/nl-NL/contact/`)
	})

	test('removes the links on a non-localized path', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeHreflang()
		visit('/plain/')

		expect(alternateLinks()).toHaveLength(0)
	})

	test('uses the deploymentUrl when provided', () => {
		visit('/nl-NL/about/')
		dispose = localization.observeHreflang({ deploymentUrl: 'https://example.com/' })

		const links = alternateLinks()
		expect(links.find(l => l.hreflang === 'nl-NL')?.href).toBe('https://example.com/nl-NL/about/')
	})

	test('dispose removes the links and stops observing', () => {
		visit('/nl-NL/about/')
		const disposeNow = localization.observeHreflang()
		disposeNow()

		expect(alternateLinks()).toHaveLength(0)

		visit('/en-GB/about/')
		expect(alternateLinks()).toHaveLength(0)
	})
})
