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
		const r = route`/test/`({ resolve: () => Promise.resolve(void 0) })
		expect(r.getMetadata().seo).toBeUndefined()
	})

	test('route with seo stores all provided fields', () => {
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
		const r = route`/test/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Just a title' },
		})

		expect(r.getMetadata().seo?.title).toBe('Just a title')
		expect(r.getMetadata().seo?.description).toBeUndefined()
		expect(r.getMetadata().seo?.noIndex).toBeUndefined()
	})

	test('child route seo is independent of parent seo', () => {
		const parent = route`/parent/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Parent' },
		})
		const child = route`/${parent}/child/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Child' },
		})

		expect(parent.getMetadata().seo?.title).toBe('Parent')
		expect(child.getMetadata().seo?.title).toBe('Child')
	})

	test('child route without seo has undefined seo even when parent has seo', () => {
		const parent = route`/parent/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Parent' },
		})
		const child = route`/${parent}/child/`({
			resolve: () => Promise.resolve(void 0),
		})

		expect(child.getMetadata().seo).toBeUndefined()
	})

	test('error route (invalid pattern) has undefined seo', () => {
		const r = route`no-leading-slash/`({ resolve: () => Promise.resolve(void 0) })
		expect(r.getMetadata().seo).toBeUndefined()
	})

	test('dynamic route can carry seo metadata', () => {
		const r = route`/article/${token('id', Number)}/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Article', noIndex: true },
		})

		expect(r.getMetadata().seo?.title).toBe('Article')
		expect(r.getMetadata().seo?.noIndex).toBe(true)
	})
})

describe('route() — lazy seo resolvers', () => {
	test('a seo function is stored as-is on the metadata', () => {
		const r = route`/test/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => ({ title: 'Lazy' }),
		})
		expect(r.getMetadata().seo).toBeTypeOf('function')
	})

	test('evaluates with the matched tokens', async () => {
		const r = route`/docs/${token('version', [1, 2])}/`({
			resolve: () => Promise.resolve(void 0),
			seo: ({ tokens }) => ({ title: `Docs v${tokens.version}` }),
		})

		const match = await r.match({ target: '/docs/2/' })
		expect(match.success).toBe(true)
		if (!match.success) return

		const seo = r.getMetadata().seo
		if (typeof seo !== 'function') throw new Error('expected a seo resolver')
		expect((await seo({ tokens: match.tokens })).title).toBe('Docs v2')
	})

	test('may be async', async () => {
		const r = route`/test/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => Promise.resolve({ title: 'Later' }),
		})

		const seo = r.getMetadata().seo
		if (typeof seo !== 'function') throw new Error('expected a seo resolver')
		expect((await seo({ tokens: {} })).title).toBe('Later')
	})
})

describe('applyRouteSeoMeta()', () => {
	function apply(seo: Parameters<typeof applyRouteSeoMeta>[0], options?: Parameters<typeof applyRouteSeoMeta>[2]) {
		applyRouteSeoMeta(seo, '/test/', options, elementFactory)
	}

	test('sets the document title, with suffix', () => {
		apply({ title: 'Hello' }, { titleSuffix: ' | App' })
		expect(document.title).toBe('Hello | App')
	})

	test('sets the description meta tag', () => {
		apply({ title: 'x', description: 'A description' })
		expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('A description')
	})

	test('sets canonical and og:url from the deployment url', () => {
		apply({ title: 'x' }, { deploymentUrl: 'https://example.com/' })
		expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe('https://example.com/test/')
		expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://example.com/test/')
	})

	test('does nothing without seo metadata', () => {
		document.title = 'untouched'
		apply(undefined)
		expect(document.title).toBe('untouched')
	})
})
