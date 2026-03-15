import { describe, test, expect, vi } from 'vitest'

// Mock component system to avoid DOM dependency
vi.mock('@rooted/components', () => ({
	component: vi.fn((def: Record<string, unknown>) => ({ ...def, __isComponent: true })),
	GenericComponent: class MockGenericComponent {},
}))

vi.mock('@rooted/components/elements', () => ({
	create: vi.fn(() => ({ tagName: 'MOCK-ROUTER' })),
}))

vi.mock('../src/dev-helper.v2.mts', () => ({ dev: {} }))

import { route } from '../src/route.mts'
import { token, wildcard } from '../src/route.tokens.mts'
import { path } from '../src/href.mts'
import { routeMetaData } from '../src/route.metadata.mts'
import { isRoute } from '../src/route.metadata.mts'
import type { Route } from '../src/route.mts'

const mockElement = { tagName: 'MOCK' } as unknown as Element

// Replicates the route-selection algorithm from router.mts
async function selectRoute(routes: Route<any>[], targetPath: string) {
	const target = path(targetPath)
	const mockCreate = () => mockElement

	const results = await Promise.all(
		routes.map(async (r) => {
			const match = await r.match({ target })
			if (!match.success) return { kind: 'no-match' as const }
			const element = await r.resolve({ create: mockCreate as typeof import('@rooted/components/elements').create, tokens: match.tokens })
			if (!element) return { kind: 'suppressed' as const, length: match.length }
			return { kind: 'matched' as const, route: r, match, element }
		}),
	)

	let best:
		| { kind: 'matched'; route: Route<any>; match: { success: true; tokens: Record<string, unknown>; length: number }; element: Element }
		| undefined
	let highestSuppressedLength = -1

	for (const r of results) {
		if (r.kind === 'suppressed') {
			highestSuppressedLength = Math.max(highestSuppressedLength, r.length)
			continue
		}
		if (r.kind !== 'matched') continue

		if (!best || r.match.length > best.match.length) {
			best = r as typeof best
			continue
		}
		if (
			r.match.length === best.match.length &&
			!r.route[routeMetaData].hasWildcard &&
			best.route[routeMetaData].hasWildcard
		) {
			best = r as typeof best
		}
	}

	if (best && highestSuppressedLength > best.match.length) return undefined
	return best
}

describe('router — route selection', () => {
	test('single matching route is selected', async () => {
		const r = route`/categories/`({ resolve: async () => mockElement })
		const result = await selectRoute([r], '/categories/')
		expect(result?.route).toBe(r)
	})

	test('no match returns undefined', async () => {
		const r = route`/categories/`({ resolve: async () => mockElement })
		expect(await selectRoute([r], '/other/')).toBeUndefined()
	})

	test('longer match wins over shorter match', async () => {
		const short = route`/categories/`({ resolve: async () => mockElement })
		const long = route`/categories/italian/`({ resolve: async () => mockElement })
		const result = await selectRoute([short, long], '/categories/italian/')
		expect(result?.route).toBe(long)
	})

	test('non-wildcard beats wildcard of equal match length', async () => {
		const specific = route`/search/hello/`({ resolve: async () => mockElement })
		const wild = route`/search/${wildcard()}/`({ resolve: async () => mockElement })
		const result = await selectRoute([wild, specific], '/search/hello/')
		expect(result?.route).toBe(specific)
	})

	test('suppressed route (resolve returns undefined) prevents shorter fallback', async () => {
		const suppressed = route`/categories/italian/`({ resolve: async () => undefined })
		const fallback = route`/categories/`({ resolve: async () => mockElement })
		const result = await selectRoute([suppressed, fallback], '/categories/italian/')
		expect(result).toBeUndefined()
	})

	test('suppression only blocks when suppressed length > best match length', async () => {
		const suppressed = route`/other/`({ resolve: async () => undefined })
		const match = route`/categories/`({ resolve: async () => mockElement })
		// suppressed is for /other/, not /categories/ — should not block /categories/
		const result = await selectRoute([suppressed, match], '/categories/')
		expect(result?.route).toBe(match)
	})
})

describe('RouterCompatibleRoute type', () => {
	test('valid routes pass isRoute check', () => {
		const r = route`/test/`({ resolve: async () => undefined })
		expect(isRoute(r)).toBe(true)
	})

	test('routes have the routeMetaData symbol', () => {
		const r = route`/test/${token('id', Number)}/`({ resolve: async () => undefined })
		expect(r[routeMetaData]).toBeDefined()
		expect(r[routeMetaData].hasParameterTokens).toBe(true)
	})

	test('wildcard route is flagged correctly', () => {
		const r = route`/search/${wildcard()}/`({ resolve: async () => undefined })
		expect(r[routeMetaData].hasWildcard).toBe(true)
	})

	test('non-wildcard route is flagged correctly', () => {
		const r = route`/articles/`({ resolve: async () => undefined })
		expect(r[routeMetaData].hasWildcard).toBe(false)
	})
})
