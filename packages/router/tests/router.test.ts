import { describe, expect, test, vi } from 'vitest'

vi.mock('@rooted/components', () => ({
	component: (c: object) => c,
	isComponent: () => false,
}))

import { route, gate, token, typedParameter, type RouteDefinition } from '../src/gate-factory.mts'
import { isRoute } from '../src/router.mts'
import type { ComponentConstructor } from '@rooted/components'

function mockComponent(name: string): ComponentConstructor {
	return { name, onMount: () => {} }
}

/** Mirrors the router's best-match selection loop, including filter-suppression. */
function selectBestRoute(routes: RouteDefinition<any, any>[], path: string): { idx: number; params: Record<string, unknown> } {
	let bestIdx = -1
	let bestEnd = -1
	let bestParams: Record<string, unknown> = {}
	let highestPatternEnd = -1

	for (let i = 0; i < routes.length; i++) {
		const r = routes[i]!
		const patternResult = r.patternMatchFrom(path)
		if (patternResult && patternResult.end > highestPatternEnd) highestPatternEnd = patternResult.end
		const result = r.matchFrom(path)
		if (!result) continue
		if (result.end > bestEnd) {
			bestIdx = i
			bestEnd = result.end
			bestParams = result.params
		}
	}

	if (highestPatternEnd > bestEnd) return { idx: -1, params: {} }
	return { idx: bestIdx, params: bestParams }
}

describe('route selection — filter suppresses parent fallback', () => {
	const validSlugs = new Set(['apple', 'banana'])
	const parentRoute = route`/categories/`(mockComponent('categories'))
	const childRoute = route`${parentRoute}/${token('slug', String)}/`(
		mockComponent('category'),
		({ slug }) => validSlugs.has(slug),
	)
	const routes = [parentRoute, childRoute]

	test('valid child slug → selects child route', () => {
		const { idx, params } = selectBestRoute(routes, '/categories/apple/')
		expect(idx).toBe(1)
		expect(params).toEqual({ slug: 'apple' })
	})

	test('invalid child slug → no match (not-found), parent not selected', () => {
		const { idx } = selectBestRoute(routes, '/categories/mango/')
		expect(idx).toBe(-1)
	})

	test('exact parent path → selects parent route', () => {
		const { idx } = selectBestRoute(routes, '/categories/')
		expect(idx).toBe(0)
	})

	test('completely unrelated path → no match', () => {
		const { idx } = selectBestRoute(routes, '/other/')
		expect(idx).toBe(-1)
	})
})

describe('isRoute', () => {
	test('returns false for a plain object', () => {
		expect(isRoute({} as any)).toBe(false)
	})

	test('returns false for a ComponentConstructor without the route brand', () => {
		expect(isRoute(mockComponent('plain') as any)).toBe(false)
	})

	test('returns true for a route produced by route``()', () => {
		const r = route`/route/`(mockComponent('test-route'))
		expect(isRoute(r)).toBe(true)
	})

	test('returns false for a gate produced by gate(routeRef, comp)', () => {
		const r = route`/route/`(mockComponent('test-route'))
		const g = gate(r, mockComponent('test-gate'))
		expect(isRoute(g as any)).toBe(false)
	})

	test('returns false for an object with only typedParameter attached (not routeBrand)', () => {
		const obj = Object.assign({}, { [typedParameter]: [] })
		expect(isRoute(obj as any)).toBe(false)
	})
})
