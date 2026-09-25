import { describe, test, expect } from 'vitest'

import { injectHeadLinks, injectMetaTags } from '../plugins/seo-html.mts'

const shell = '<html><head><title>x</title>\n</head><body></body></html>'

describe('injectHeadLinks()', () => {
	test('injects links before </head>', () => {
		// Arrange
		const links = [
			{ rel: 'alternate', hreflang: 'en-GB', href: 'https://example.com/en-GB/about/' },
			{ rel: 'alternate', hreflang: 'nl-NL', href: 'https://example.com/nl-NL/about/' },
		]

		// Act
		const result = injectHeadLinks(shell, links)

		// Assert
		expect(result).toContain('<link rel="alternate" hreflang="en-GB" href="https://example.com/en-GB/about/" />')
		expect(result).toContain('<link rel="alternate" hreflang="nl-NL" href="https://example.com/nl-NL/about/" />')
		expect(result.indexOf('hreflang="en-GB"')).toBeLessThan(result.indexOf('</head>'))
	})

	test('replaces a link that already exists with the same rel and hreflang', () => {
		// Arrange: what the app writes while pre-rendering, from happy-dom's origin
		const existing = shell.replace('</head>', '<link rel="alternate" hreflang="en-GB" href="http://localhost/en-GB/">\n</head>')

		// Act
		const result = injectHeadLinks(existing, [
			{ rel: 'alternate', hreflang: 'en-GB', href: 'https://example.com/en-GB/' },
		])

		// Assert
		expect(result).toBe(shell.replace('</head>', '<link rel="alternate" hreflang="en-GB" href="https://example.com/en-GB/" />\n</head>'))
	})

	test('escapes attribute values', () => {
		// Act
		const result = injectHeadLinks(shell, [
			{ rel: 'alternate', hreflang: 'en-GB', href: 'https://example.com/?a=1&b="2"' },
		])

		// Assert
		expect(result).toContain('href="https://example.com/?a=1&amp;b=&quot;2&quot;"')
	})

	test('returns the html unchanged for an empty link list', () => {
		// Act
		const result = injectHeadLinks(shell, [])

		// Assert
		expect(result).toBe(shell)
	})
})

describe('injectMetaTags() on a pre-rendered page', () => {
	// What the router writes into <head> at runtime, from happy-dom's origin
	const rendered = '<html><head><title>Runtime</title>'
		+ '<link rel="canonical" href="http://localhost/about/">'
		+ '<meta property="og:url" content="http://localhost/about/">'
		+ '<meta property="og:title" content="Runtime">'
		+ '<meta property="og:image" content="https://example.com/runtime.png">'
		+ '\n</head><body></body></html>'

	test('replaces the canonical and og:url with the deployment URL', () => {
		// Act
		const result = injectMetaTags(rendered, undefined, 'https://example.com/about/', undefined, undefined)

		// Assert
		expect(result).toContain('<link rel="canonical" href="https://example.com/about/" />')
		expect(result).toContain('<meta property="og:url" content="https://example.com/about/" />')
		expect(result).not.toContain('localhost')
	})

	test('replaces the title and og:title with the route\'s', () => {
		// Act
		const result = injectMetaTags(rendered, { title: 'About' }, 'https://example.com/about/', undefined, ' | Site')

		// Assert
		expect(result).toContain('<title>About | Site</title>')
		expect(result).toContain('<meta property="og:title" content="About" />')
		expect(result.match(/og:title/g)).toHaveLength(1)
	})

	test('keeps an og:image that is there when the route has none of its own', () => {
		// Act
		const result = injectMetaTags(rendered, undefined, 'https://example.com/about/', 'https://example.com/default.png', undefined)

		// Assert
		expect(result).toContain('content="https://example.com/runtime.png"')
		expect(result).not.toContain('default.png')
	})
})
