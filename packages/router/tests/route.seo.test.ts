import { describe, test, expect, vi } from 'vitest'

// Suppress dev warnings during tests
vi.mock('../src/dev-helper.mts', () => ({ devHelper: {} }))

import { route } from '../src/route.mts'
import { token } from '../src/route.tokens.mts'

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
