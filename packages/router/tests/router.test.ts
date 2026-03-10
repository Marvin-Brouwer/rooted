import { describe, expect, test, vi } from 'vitest'

vi.mock('@rooted/components', () => ({
	component: (c: object) => c,
	isComponent: () => false,
}))

import { route, gate, typedParameter } from '../src/gate-factory.mts'
import { isRoute } from '../src/router.mts'
import type { ComponentConstructor } from '@rooted/components'

function mockComponent(name: string): ComponentConstructor {
	return { name, onMount: () => {} }
}

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
