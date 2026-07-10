import { describe, test, expect } from 'vitest'

import { injectHeadLinks } from '../plugins/seo-html.mts'

const shell = '<html><head><title>x</title>\n</head><body></body></html>'

describe('injectHeadLinks()', () => {
	test('injects links before </head>', () => {
		const result = injectHeadLinks(shell, [
			{ rel: 'alternate', hreflang: 'en-GB', href: 'https://example.com/en-GB/about/' },
			{ rel: 'alternate', hreflang: 'nl-NL', href: 'https://example.com/nl-NL/about/' },
		])
		expect(result).toContain('<link rel="alternate" hreflang="en-GB" href="https://example.com/en-GB/about/" />')
		expect(result).toContain('<link rel="alternate" hreflang="nl-NL" href="https://example.com/nl-NL/about/" />')
		expect(result.indexOf('hreflang="en-GB"')).toBeLessThan(result.indexOf('</head>'))
	})

	test('skips links that already exist with the same rel and hreflang', () => {
		const existing = shell.replace('</head>', '<link rel="alternate" hreflang="en-GB" href="https://old.example/" />\n</head>')
		const result = injectHeadLinks(existing, [
			{ rel: 'alternate', hreflang: 'en-GB', href: 'https://example.com/en-GB/' },
		])
		expect(result).toBe(existing)
	})

	test('escapes attribute values', () => {
		const result = injectHeadLinks(shell, [
			{ rel: 'alternate', hreflang: 'en-GB', href: 'https://example.com/?a=1&b="2"' },
		])
		expect(result).toContain('href="https://example.com/?a=1&amp;b=&quot;2&quot;"')
	})

	test('returns the html unchanged for an empty link list', () => {
		expect(injectHeadLinks(shell, [])).toBe(shell)
	})
})
