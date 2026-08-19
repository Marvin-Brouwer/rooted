import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'

vi.mock('../src/dev-helper.mts', () => ({ devHelper: {} }))

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

import { href } from '../src/href.export.mts'
import { path, url, join, current, forAny, Path, Url } from '../src/href.mts'
import { route } from '../src/route.mts'
import { token } from '../src/route.tokens.mts'

describe('path()', () => {
	test('creates a Path instance', () => {
		// Act
		const result = path('/categories/')

		// Assert
		expect(result).toBeInstanceOf(Path)
	})

	test('pathOnly returns the pathname', () => {
		// Act
		const result = path('/categories/').pathOnly

		// Assert
		expect(result).toBe('/categories/')
	})

	test('query string is preserved', () => {
		// Act
		const result = path('/search/?q=hello').queryString

		// Assert
		expect(result).toBe('?q=hello')
	})
})

describe('url()', () => {
	test('creates a Url instance', () => {
		// Act
		const result = url('https://example.com/page/')

		// Assert
		expect(result).toBeInstanceOf(Url)
	})

	test('host is accessible', () => {
		// Act
		const result = url('https://example.com/page/').host

		// Assert
		expect(result).toBe('example.com')
	})

	test('path property returns a Path', () => {
		// Act
		const p = url('https://example.com/page/').path

		// Assert
		expect(p).toBeInstanceOf(Path)
		expect(p.pathOnly).toBe('/page/')
	})
})

describe('join()', () => {
	test('joins two Path segments', () => {
		// Act
		const result = join(path('/a/'), path('b/'))

		// Assert
		expect(result).toBeInstanceOf(Path)
		expect(result.pathOnly).toBe('/a/b/')
	})

	test('returns a Url when base is a Url', () => {
		// Act
		const result = join(url('https://example.com/a/'), path('b/'))

		// Assert
		expect(result).toBeInstanceOf(Url)
	})
})

describe('current()', () => {
	test('returns a Path for the stubbed location', () => {
		// Act
		const c = current()

		// Assert
		expect(c).toBeInstanceOf(Path)
		expect(c.pathOnly).toBe('/test/')
	})
})

describe('forAny()', () => {
	test('native URL → Url instance', () => {
		// Act
		const result = forAny(new URL('https://example.com/p/'))

		// Assert
		expect(result).toBeInstanceOf(Url)
	})

	test('generates a path from a route and parameters', () => {
		// Arrange
		const TestRoute = route`/articles/${token('id', Number)}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const result = forAny(TestRoute, { id: 42 })

		// Assert
		expect(result).toBeInstanceOf(Path)
		expect(result.pathOnly).toBe('/articles/42/')
	})

	test('generates a path from a route with a constant token', () => {
		// Arrange
		const AboutRoute = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const result = forAny(AboutRoute, { locale: 'nl-NL' })

		// Assert
		expect(result).toBeInstanceOf(Path)
		expect(result.pathOnly).toBe('/nl-NL/about/')
	})

	test('throws for a constant token value outside the list', () => {
		// Act
		const AboutRoute = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(() => forAny(AboutRoute, { locale: 'de-DE' as 'en-GB' })).toThrow()
	})

	test('Path passthrough', () => {
		// Act
		const p = path('/hello/')

		// Act
		const result = forAny(p)

		// Assert
		expect(result).toBe(p)
	})

	test('Url passthrough', () => {
		// Act
		const u = url('https://x.com/')

		// Act
		const result = forAny(u)

		// Assert
		expect(result).toBe(u)
	})
})

describe('href namespace', () => {
	test('href.path() works like path()', () => {
		// Act
		const result = href.path('/x/')

		// Assert
		expect(result).toBeInstanceOf(Path)
		expect(result.pathOnly).toBe('/x/')
	})

	test('href.url() works like url()', () => {
		// Act
		const result = href.url('https://a.com/')

		// Assert
		expect(result).toBeInstanceOf(Url)
	})

	test('href.current() returns current path', () => {
		// Act
		const result = href.current()

		// Assert
		expect(result).toBeInstanceOf(Path)
	})

	test('href.for is forAny', () => {
		// Assert
		expect(href.for).toBe(forAny)
	})
})
