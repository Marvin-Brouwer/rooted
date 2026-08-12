import { describe, test, expect, vi } from 'vitest'

// Suppress dev warnings during tests
vi.mock('../src/dev-helper.mts', () => ({ devHelper: {} }))

import { isRoute, routeMetadata } from '../src/route.metadata.mts'
import { route } from '../src/route.mts'
import { token, wildcard } from '../src/route.tokens.mts'

describe('route() — pattern validation', () => {
	test('missing leading slash → error route that never matches', async () => {
		// Arrange
		const r = route`no-slash/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/no-slash/' })

		// Assert
		expect(match.success).toBe(false)
	})

	test('missing trailing slash → error route', async () => {
		// Arrange
		const r = route`/no-trailing`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/no-trailing' })

		// Assert
		expect(match.success).toBe(false)
	})

	test('valid pattern → isRoute returns true', () => {
		// Act
		const r = route`/valid/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const result = isRoute(r)

		// Assert
		expect(result).toBe(true)
	})
})

describe('isRoute()', () => {
	test('returns false for null', () => {
		// Act
		const result = isRoute(null)

		// Assert
		expect(result).toBe(false)
	})
	test('returns false for plain object', () => {
		// Act
		const result = isRoute({})

		// Assert
		expect(result).toBe(false)
	})
	test('returns false for a string', () => {
		// Act
		const result = isRoute('hello')

		// Assert
		expect(result).toBe(false)
	})

	test('returns true for a route', () => {
		// Act
		const r = route`/test/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const result = isRoute(r)

		// Assert
		expect(result).toBe(true)
	})
})

describe('route() — basic matching', () => {
	test('matches exact path', async () => {
		// Arrange
		const r = route`/categories/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/categories/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens).toEqual({})
		expect(match.length).toBe('/categories/'.length)
	})

	test('does not match a different path', async () => {
		// Act
		const r = route`/categories/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect((await r.match({ target: '/other/' })).success).toBe(false)
	})

	test('does not match without trailing slash', async () => {
		// Act
		const r = route`/categories/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect((await r.match({ target: '/categories' })).success).toBe(false)
	})

	test('root path "/" matches "/"', async () => {
		// Arrange
		const r = route`/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/' })

		// Assert
		expect(match.success).toBe(true)
	})
})

describe('route() — token matching', () => {
	test('Number token: matches valid integer', async () => {
		// Arrange
		const r = route`/recipe/${token('id', Number)}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/recipe/42/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.id).toBe(42)
		expect(match.length).toBe('/recipe/42/'.length)
	})

	test('Number token: fails for non-numeric segment', async () => {
		// Act
		const r = route`/recipe/${token('id', Number)}/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect((await r.match({ target: '/recipe/abc/' })).success).toBe(false)
	})

	test('String token: matches any segment', async () => {
		// Arrange
		const r = route`/article/${token('slug', String)}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/article/hello-world/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.slug).toBe('hello-world')
	})

	test('multiple tokens in one route', async () => {
		// Arrange
		const r = route`/a/${token('x', Number)}/${token('y', String)}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/a/7/foo/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.x).toBe(7)
		expect(match.tokens.y).toBe('foo')
	})
})

describe('route() — wildcard matching', () => {
	test('matches a single path segment', async () => {
		// Arrange
		const r = route`/search/${wildcard()}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/search/pasta/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.rest).toBe('pasta')
	})

	test('matches multiple path segments (greedy wildcard)', async () => {
		// Arrange
		const r = route`/search/${wildcard()}/`({ resolve: () => Promise.resolve(void 0) })
		// wildcard is greedy — captures the full remainder including intermediate slashes

		// Act
		const match = await r.match({ target: '/search/hello/world/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.rest).toBe('hello/world')
	})

	test('named wildcard uses the given key', async () => {
		// Arrange
		const r = route`/search/${wildcard('query')}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/search/pasta/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.query).toBe('pasta')
	})
})

describe('route() — parent route composition', () => {
	test('child route matches the combined path', async () => {
		// Arrange
		const parent = route`/categories/`({ resolve: () => Promise.resolve(void 0) })
		const child = route`/${parent}/${token('slug', String)}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await child.match({ target: '/categories/italian/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.slug).toBe('italian')
	})

	test('child route does not match a different prefix', async () => {
		// Arrange
		const parent = route`/categories/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const child = route`/${parent}/${token('slug', String)}/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect((await child.match({ target: '/other/italian/' })).success).toBe(false)
	})

	test('child tokens include parent tokens', async () => {
		// Arrange
		const parent = route`/a/${token('x', Number)}/`({ resolve: () => Promise.resolve(void 0) })
		const child = route`/${parent}/${token('y', String)}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await child.match({ target: '/a/5/hello/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.x).toBe(5)
		expect(match.tokens.y).toBe('hello')
	})
})

describe('route() — constant token matching', () => {
	test('matches a listed value and exposes it as a token', async () => {
		// Arrange
		const r = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/nl-NL/about/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.locale).toBe('nl-NL')
	})

	test('does not match a value outside the list', async () => {
		// Act
		const r = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect((await r.match({ target: '/de-DE/about/' })).success).toBe(false)
	})

	test('constant parent composes with a child route', async () => {
		// Arrange
		const parent = route`/${token('locale', ['en-GB', 'nl-NL'])}/`({ resolve: () => Promise.resolve(void 0) })
		const child = route`/${parent}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await child.match({ target: '/en-GB/about/' })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.locale).toBe('en-GB')
	})

	test('empty values array → error route that never matches', async () => {
		// Arrange
		const empty = [] as unknown as [string]

		// Act
		const r = route`/${token('locale', empty)}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect((await r.match({ target: '/en-GB/about/' })).success).toBe(false)
	})
})

describe('route() — staticPaths metadata', () => {
	test('fully static route unrolls to its own static path', () => {
		// Act
		const r = route`/categories/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(r[routeMetadata].staticPaths).toEqual(['/categories/'])
		expect(r[routeMetadata].staticRoute).toBe('/categories/')
	})

	test('single constant token unrolls to one path per value', () => {
		// Act
		const r = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(r[routeMetadata].staticPaths).toEqual(['/en-GB/about/', '/nl-NL/about/'])
	})

	test('staticRoute stays false for constant token routes (back-compat)', () => {
		// Act
		const r = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(r[routeMetadata].staticRoute).toBe(false)
	})

	test('two constant tokens unroll to the cartesian product', () => {
		// Act
		const r = route`/${token('locale', ['en', 'nl'])}/docs/${token('version', [1, 2])}/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(r[routeMetadata].staticPaths).toEqual([
			'/en/docs/1/',
			'/en/docs/2/',
			'/nl/docs/1/',
			'/nl/docs/2/',
		])
	})

	test('constant parent unrolls through a static child', () => {
		// Arrange
		const parent = route`/${token('locale', ['en-GB', 'nl-NL'])}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const child = route`/${parent}/about/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(child[routeMetadata].staticPaths).toEqual(['/en-GB/about/', '/nl-NL/about/'])
	})

	test('typed token → false', () => {
		// Act
		const r = route`/recipe/${token('id', Number)}/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(r[routeMetadata].staticPaths).toBe(false)
	})

	test('wildcard → false', () => {
		// Act
		const r = route`/search/${wildcard()}/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(r[routeMetadata].staticPaths).toBe(false)
	})

	test('mixed constant and typed token → false', () => {
		// Act
		const r = route`/${token('locale', ['en', 'nl'])}/recipe/${token('id', Number)}/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(r[routeMetadata].staticPaths).toBe(false)
	})

	test('dynamic parent → false', () => {
		// Arrange
		const parent = route`/a/${token('x', Number)}/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const child = route`/${parent}/details/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(child[routeMetadata].staticPaths).toBe(false)
	})

	test('invalid pattern → false', () => {
		// Act
		const r = route`no-slash/`({ resolve: () => Promise.resolve(void 0) })

		// Assert
		expect(r[routeMetadata].staticPaths).toBe(false)
	})
})

describe('route() — checkInclusive: false', () => {
	test('prefix match succeeds when checkInclusive is false', async () => {
		// Arrange
		const r = route`/categories/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/categories/italian/', checkInclusive: false })

		// Assert
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.length).toBe('/categories/'.length)
	})

	test('still fails if the prefix itself does not match', async () => {
		// Arrange
		const r = route`/categories/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const match = await r.match({ target: '/other/italian/', checkInclusive: false })

		// Assert
		expect(match.success).toBe(false)
	})
})
