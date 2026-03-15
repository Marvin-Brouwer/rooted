import { describe, test, expect, vi } from 'vitest'

// Suppress dev warnings during tests
vi.mock('../src/dev-helper.v2.mts', () => ({ dev: {} }))

import { route } from '../src/route.mts'
import { token, wildcard } from '../src/route.tokens.mts'
import { isRoute } from '../src/route.metadata.mts'

describe('route() — pattern validation', () => {
	test('missing leading slash → error route that never matches', async () => {
		const r = route`no-slash/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/no-slash/' })
		expect(match.success).toBe(false)
	})

	test('missing trailing slash → error route', async () => {
		const r = route`/no-trailing`({ resolve: async () => undefined })
		const match = await r.match({ target: '/no-trailing' })
		expect(match.success).toBe(false)
	})

	test('valid pattern → isRoute returns true', () => {
		const r = route`/valid/`({ resolve: async () => undefined })
		expect(isRoute(r)).toBe(true)
	})
})

describe('isRoute()', () => {
	test('returns false for null', () => expect(isRoute(null)).toBe(false))
	test('returns false for plain object', () => expect(isRoute({})).toBe(false))
	test('returns false for a string', () => expect(isRoute('hello')).toBe(false))

	test('returns true for a route', () => {
		const r = route`/test/`({ resolve: async () => undefined })
		expect(isRoute(r)).toBe(true)
	})
})

describe('route() — basic matching', () => {
	test('matches exact path', async () => {
		const r = route`/categories/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/categories/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens).toEqual({})
		expect(match.length).toBe('/categories/'.length)
	})

	test('does not match a different path', async () => {
		const r = route`/categories/`({ resolve: async () => undefined })
		expect((await r.match({ target: '/other/' })).success).toBe(false)
	})

	test('does not match without trailing slash', async () => {
		const r = route`/categories/`({ resolve: async () => undefined })
		expect((await r.match({ target: '/categories' })).success).toBe(false)
	})

	test('root path "/" matches "/"', async () => {
		const r = route`/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/' })
		expect(match.success).toBe(true)
	})
})

describe('route() — token matching', () => {
	test('Number token: matches valid integer', async () => {
		const r = route`/recipe/${token('id', Number)}/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/recipe/42/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.id).toBe(42)
		expect(match.length).toBe('/recipe/42/'.length)
	})

	test('Number token: fails for non-numeric segment', async () => {
		const r = route`/recipe/${token('id', Number)}/`({ resolve: async () => undefined })
		expect((await r.match({ target: '/recipe/abc/' })).success).toBe(false)
	})

	test('String token: matches any segment', async () => {
		const r = route`/article/${token('slug', String)}/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/article/hello-world/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.slug).toBe('hello-world')
	})

	test('multiple tokens in one route', async () => {
		const r = route`/a/${token('x', Number)}/${token('y', String)}/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/a/7/foo/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.x).toBe(7)
		expect(match.tokens.y).toBe('foo')
	})
})

describe('route() — wildcard matching', () => {
	test('matches a single path segment', async () => {
		const r = route`/search/${wildcard()}/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/search/pasta/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.rest).toBe('pasta')
	})

	test('does not match multiple segments (checkInclusive=true)', async () => {
		const r = route`/search/${wildcard()}/`({ resolve: async () => undefined })
		// wildcard captures up to the next '/', leaving '/world/' unconsumed
		expect((await r.match({ target: '/search/hello/world/' })).success).toBe(false)
	})

	test('named wildcard uses the given key', async () => {
		const r = route`/search/${wildcard('query')}/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/search/pasta/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.query).toBe('pasta')
	})
})

describe('route() — parent route composition', () => {
	test('child route matches the combined path', async () => {
		const parent = route`/categories/`({ resolve: async () => undefined })
		const child = route`${parent}${token('slug', String)}/`({ resolve: async () => undefined })
		const match = await child.match({ target: '/categories/italian/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.slug).toBe('italian')
	})

	test('child route does not match a different prefix', async () => {
		const parent = route`/categories/`({ resolve: async () => undefined })
		const child = route`${parent}${token('slug', String)}/`({ resolve: async () => undefined })
		expect((await child.match({ target: '/other/italian/' })).success).toBe(false)
	})

	test('child tokens include parent tokens', async () => {
		const parent = route`/a/${token('x', Number)}/`({ resolve: async () => undefined })
		const child = route`${parent}${token('y', String)}/`({ resolve: async () => undefined })
		const match = await child.match({ target: '/a/5/hello/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.x).toBe(5)
		expect(match.tokens.y).toBe('hello')
	})
})

describe('route() — checkInclusive: false', () => {
	test('prefix match succeeds when checkInclusive is false', async () => {
		const r = route`/categories/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/categories/italian/', checkInclusive: false })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.length).toBe('/categories/'.length)
	})

	test('still fails if the prefix itself does not match', async () => {
		const r = route`/categories/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/other/italian/', checkInclusive: false })
		expect(match.success).toBe(false)
	})
})
