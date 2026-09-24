import { describe, test, expect } from 'vitest'

import { buildSitemapXml } from '../plugins/seo-sitemap.mts'

const aboutAlternates = [
	{ hreflang: 'en-GB', href: 'https://example.com/en-GB/about/' },
	{ hreflang: 'nl-NL', href: 'https://example.com/nl-NL/about/' },
	{ hreflang: 'x-default', href: 'https://example.com/en-GB/about/' },
]

describe('buildSitemapXml()', () => {
	test('writes alternates as xhtml:link elements inside the url', () => {
		// Arrange
		const entries = [{ loc: 'https://example.com/nl-NL/about/', alternates: aboutAlternates }]

		// Act
		const xml = buildSitemapXml(entries)

		// Assert
		expect(xml).toContain([
			'\t<url>',
			'\t\t<loc>https://example.com/nl-NL/about/</loc>',
			'\t\t<xhtml:link rel="alternate" hreflang="en-GB" href="https://example.com/en-GB/about/" />',
			'\t\t<xhtml:link rel="alternate" hreflang="nl-NL" href="https://example.com/nl-NL/about/" />',
			'\t\t<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/en-GB/about/" />',
			'\t</url>',
		].join('\n'))
	})

	test('declares the xhtml namespace when any entry has alternates', () => {
		// Arrange
		const entries = [
			{ loc: 'https://example.com/' },
			{ loc: 'https://example.com/nl-NL/about/', alternates: aboutAlternates },
		]

		// Act
		const xml = buildSitemapXml(entries)

		// Assert
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')
	})

	test('leaves the xhtml namespace out without alternates', () => {
		// Arrange
		const entries = [{ loc: 'https://example.com/', alternates: [] }]

		// Act
		const xml = buildSitemapXml(entries)

		// Assert
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
		expect(xml).not.toContain('xhtml')
	})

	test('escapes alternate attribute values', () => {
		// Arrange
		const entries = [{
			loc: 'https://example.com/about/',
			alternates: [{ hreflang: 'en-GB', href: 'https://example.com/about/?a=1&b="2"' }],
		}]

		// Act
		const xml = buildSitemapXml(entries)

		// Assert
		expect(xml).toContain('href="https://example.com/about/?a=1&amp;b=&quot;2&quot;"')
	})
})
