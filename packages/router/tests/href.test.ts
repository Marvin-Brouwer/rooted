import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'

vi.mock('../src/dev-helper.v2.mts', () => ({ dev: {} }))

beforeAll(() => {
	vi.stubGlobal('location', {
		pathname: '/test/',
		href: 'http://localhost/test/',
		origin: 'http://localhost',
	})
})

afterAll(() => {
	vi.unstubAllGlobals()
})

import { path, url, join, current, forAny, Path, Url } from '../src/href.mts'
import { href } from '../src/href.export.mts'
import { route } from '../src/route.mts'
import { token } from '../src/route.tokens.mts'

describe('path()', () => {
	test('creates a Path instance', () => {
		expect(path('/categories/')).toBeInstanceOf(Path)
	})

	test('pathOnly returns the pathname', () => {
		expect(path('/categories/').pathOnly).toBe('/categories/')
	})

	test('query string is preserved', () => {
		expect(path('/search/?q=hello').queryString).toBe('?q=hello')
	})
})

describe('url()', () => {
	test('creates a Url instance', () => {
		expect(url('https://example.com/page/')).toBeInstanceOf(Url)
	})

	test('host is accessible', () => {
		expect(url('https://example.com/page/').host).toBe('example.com')
	})

	test('path property returns a Path', () => {
		const p = url('https://example.com/page/').path
		expect(p).toBeInstanceOf(Path)
		expect(p.pathOnly).toBe('/page/')
	})
})

describe('join()', () => {
	test('joins two Path segments', () => {
		const result = join(path('/a/'), path('b/'))
		expect(result).toBeInstanceOf(Path)
		expect(result.pathOnly).toBe('/a/b/')
	})

	test('returns a Url when base is a Url', () => {
		const result = join(url('https://example.com/a/'), path('b/'))
		expect(result).toBeInstanceOf(Url)
	})
})

describe('current()', () => {
	test('returns a Path for the stubbed location', () => {
		const c = current()
		expect(c).toBeInstanceOf(Path)
		expect(c.pathOnly).toBe('/test/')
	})
})

describe('forAny()', () => {
	test('native URL → Url instance', () => {
		const result = forAny(new URL('https://example.com/p/'))
		expect(result).toBeInstanceOf(Url)
	})

	test('generates a path from a route and parameters', () => {
		const TestRoute = route`/articles/${token('id', Number)}/`({ resolve: async () => undefined })
		const result = forAny(TestRoute, { id: 42 })
		expect(result).toBeInstanceOf(Path)
		expect(result.pathOnly).toBe('/articles/42/')
	})

	test('Path passthrough', () => {
		const p = path('/hello/')
		expect(forAny(p)).toBe(p)
	})

	test('Url passthrough', () => {
		const u = url('https://x.com/')
		expect(forAny(u)).toBe(u)
	})
})

describe('href namespace', () => {
	test('href.path() works like path()', () => {
		const result = href.path('/x/')
		expect(result).toBeInstanceOf(Path)
		expect(result.pathOnly).toBe('/x/')
	})

	test('href.url() works like url()', () => {
		expect(href.url('https://a.com/')).toBeInstanceOf(Url)
	})

	test('href.current() returns current path', () => {
		expect(href.current()).toBeInstanceOf(Path)
	})

	test('href.for is forAny', () => {
		expect(href.for).toBe(forAny)
	})
})
