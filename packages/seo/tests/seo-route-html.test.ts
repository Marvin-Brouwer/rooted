import { describe, test, expect } from 'vitest'

import { seoPlugin } from '../plugins/seo.mts'

import type { SeoApi } from '../plugins/seo-api.mts'

const shell = '<html><head><title>x</title>\n</head><body></body></html>'

function api(): SeoApi {
	return (seoPlugin('https://example.com/', { name: 'Recipes', description: 'All the recipes' }, undefined) as unknown as { api: SeoApi }).api
}

describe('injectRouteHtml()', () => {
	test('adds the site\'s WebSite JSON-LD to a route page', () => {
		// Act
		const result = api().injectRouteHtml(shell, '/about/')

		// Assert
		expect(result).toContain('"@type": "WebSite"')
		expect(result).toContain('"name": "Recipes"')
	})

	test('points the canonical at the route, not the root', () => {
		// Act
		const result = api().injectRouteHtml(shell, '/about/')

		// Assert
		expect(result).toContain('<link rel="canonical" href="https://example.com/about/" />')
		expect(result.match(/rel="canonical"/g)).toHaveLength(1)
	})
})
