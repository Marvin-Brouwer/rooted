import { describe, test, expect, vi } from 'vitest'

// Suppress dev warnings during tests
vi.mock('../src/dev-helper.mts', () => ({ devHelper: {} }))

import { route } from '../src/route.mts'
import { token } from '../src/route.tokens.mts'
import { applyRouteSeoMeta } from '../src/seo-meta.mts'

import type { ElementFactory } from '@rooted/components/elements'

const elementFactory = ((tag: string, properties: Record<string, string>) => {
	const node = document.createElement(tag)
	for (const [attribute, value] of Object.entries(properties)) node.setAttribute(attribute, value)
	return node
}) as unknown as ElementFactory

describe('route() — seo metadata', () => {
	test('route without seo has undefined seo metadata', () => {
		// Act
		const r = route`/test/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const result = r.getMetadata().seo

		// Assert
		expect(result).toBeUndefined()
	})

	test('route with seo stores all provided fields', () => {
		// Act
		const r = route`/test/`({
			resolve: () => Promise.resolve(void 0),
			seo: {
				title: 'Test page',
				description: 'A test description.',
				noIndex: true,
				excludeFromSitemap: true,
				image: '/og-test.png',
				changefreq: 'weekly',
				priority: 0.8,
			},
		})

		// Assert

		expect(r.getMetadata().seo).toEqual({
			title: 'Test page',
			description: 'A test description.',
			noIndex: true,
			excludeFromSitemap: true,
			image: '/og-test.png',
			changefreq: 'weekly',
			priority: 0.8,
		})
	})

	test('route with partial seo only stores provided fields', () => {
		// Act
		const r = route`/test/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Just a title' },
		})

		// Assert

		expect(r.getMetadata().seo?.title).toBe('Just a title')
		expect(r.getMetadata().seo?.description).toBeUndefined()
		expect(r.getMetadata().seo?.noIndex).toBeUndefined()
	})

	test('child route seo is independent of parent seo', () => {
		// Arrange
		const parent = route`/parent/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Parent' },
		})

		// Act
		const child = route`/${parent}/child/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Child' },
		})

		// Assert

		expect(parent.getMetadata().seo?.title).toBe('Parent')
		expect(child.getMetadata().seo?.title).toBe('Child')
	})

	test('child route without seo has undefined seo even when parent has seo', () => {
		// Arrange
		const parent = route`/parent/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Parent' },
		})

		// Act
		const child = route`/${parent}/child/`({
			resolve: () => Promise.resolve(void 0),
		})

		// Assert

		expect(child.getMetadata().seo).toBeUndefined()
	})

	test('error route (invalid pattern) has undefined seo', () => {
		// Act
		const r = route`no-leading-slash/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const result = r.getMetadata().seo

		// Assert
		expect(result).toBeUndefined()
	})

	test('dynamic route can carry seo metadata', () => {
		// Act
		const r = route`/article/${token('id', Number)}/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Article', noIndex: true },
		})

		// Assert

		expect(r.getMetadata().seo?.title).toBe('Article')
		expect(r.getMetadata().seo?.noIndex).toBe(true)
	})
})

describe('route() — lazy seo resolvers', () => {
	test('a seo function is stored as-is on the metadata', () => {
		// Act
		const r = route`/test/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => ({ title: 'Lazy' }),
		})

		// Act
		const result = r.getMetadata().seo

		// Assert
		expect(result).toBeTypeOf('function')
	})

	test('evaluates with the matched tokens', async () => {
		// Arrange
		const r = route`/docs/${token('version', [1, 2])}/`({
			resolve: () => Promise.resolve(void 0),
			seo: ({ tokens }) => ({ title: `Docs v${tokens.version}` }),
		})

		// Act
		const match = await r.match({ target: '/docs/2/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return

		const seo = r.getMetadata().seo
		if (typeof seo !== 'function') throw new Error('expected a seo resolver')
		expect((await seo({ tokens: match.tokens })).title).toBe('Docs v2')
	})

	test('may be async', async () => {
		// Arrange
		const r = route`/test/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => Promise.resolve({ title: 'Later' }),
		})

		const seo = r.getMetadata().seo

		// Act
		if (typeof seo !== 'function') throw new Error('expected a seo resolver')

		// Assert
		expect((await seo({ tokens: {} })).title).toBe('Later')
	})
})

describe('applyRouteSeoMeta()', () => {
	function apply(seo: Parameters<typeof applyRouteSeoMeta>[0], options?: Parameters<typeof applyRouteSeoMeta>[2]) {
		applyRouteSeoMeta(seo, '/test/', options, elementFactory)
	}

	test('sets the document title, with suffix', () => {
		// Act
		apply({ title: 'Hello' }, { titleSuffix: ' | App' })

		// Assert
		expect(document.title).toBe('Hello | App')
	})

	test('sets the description meta tag', () => {
		// Act
		apply({ title: 'x', description: 'A description' })

		// Act
		const result = document.head.querySelector('meta[name="description"]')?.getAttribute('content')

		// Assert
		expect(result).toBe('A description')
	})

	test('sets canonical and og:url from the deployment url', () => {
		// Act
		apply({ title: 'x' }, { deploymentUrl: 'https://example.com/' })

		// Assert
		expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe('https://example.com/test/')
		expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://example.com/test/')
	})

	test('does nothing without seo metadata', () => {
		// Arrange
		document.title = 'untouched'

		// Act
		apply(undefined)

		// Assert
		expect(document.title).toBe('untouched')
	})
})
