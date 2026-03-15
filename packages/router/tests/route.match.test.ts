import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'

vi.mock('../src/dev-helper.v2.mts', () => ({ dev: {} }))

beforeAll(() => {
	vi.stubGlobal('location', {
		pathname: '/current/',
		href: 'http://localhost/current/',
		origin: 'http://localhost',
	})
})

afterAll(() => {
	vi.unstubAllGlobals()
})

import { route } from '../src/route.mts'
import { token } from '../src/route.tokens.mts'
import { path, url, Path, Url } from '../src/href.mts'

describe('RouteMatch — success shape', () => {
	test('success match has tokens and length', async () => {
		const r = route`/items/${token('id', Number)}/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/items/7/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.tokens.id).toBe(7)
		expect(typeof match.length).toBe('number')
		expect(match.length).toBeGreaterThan(0)
	})

	test('length equals the number of characters consumed', async () => {
		const r = route`/hello/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/hello/' })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.length).toBe('/hello/'.length)
	})
})

describe('RouteMatch — failure shape', () => {
	test('failure match has only success: false', async () => {
		const r = route`/hello/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/other/' })
		expect(match.success).toBe(false)
		expect((match as { tokens?: unknown }).tokens).toBeUndefined()
	})
})

describe('MatchRouteOptions — target types', () => {
	const r = route`/test/`({ resolve: async () => undefined })

	test('string target', async () => {
		expect((await r.match({ target: '/test/' })).success).toBe(true)
	})

	test('Path target', async () => {
		expect((await r.match({ target: path('/test/') })).success).toBe(true)
	})

	test('Url target uses the pathname', async () => {
		expect((await r.match({ target: url('http://example.com/test/') })).success).toBe(true)
	})

	test('native URL target', async () => {
		expect((await r.match({ target: new URL('/test/', 'http://localhost') })).success).toBe(true)
	})
})

describe('MatchRouteOptions — target instances are recognised', () => {
	test('Path instance is recognised', async () => {
		const p = path('/hello/')
		expect(p).toBeInstanceOf(Path)
		const r = route`/hello/`({ resolve: async () => undefined })
		expect((await r.match({ target: p })).success).toBe(true)
	})

	test('Url instance uses its path', async () => {
		const u = url('https://example.com/hello/')
		expect(u).toBeInstanceOf(Url)
		const r = route`/hello/`({ resolve: async () => undefined })
		expect((await r.match({ target: u })).success).toBe(true)
	})
})

describe('MatchRouteOptions — checkInclusive', () => {
	test('checkInclusive defaults to true (full path must be consumed)', async () => {
		const r = route`/a/`({ resolve: async () => undefined })
		expect((await r.match({ target: '/a/extra/' })).success).toBe(false)
	})

	test('checkInclusive: false allows trailing content', async () => {
		const r = route`/a/`({ resolve: async () => undefined })
		const match = await r.match({ target: '/a/extra/', checkInclusive: false })
		expect(match.success).toBe(true)
		if (!match.success) return
		expect(match.length).toBe('/a/'.length)
	})
})
