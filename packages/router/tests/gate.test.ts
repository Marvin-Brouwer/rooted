import { describe, test, expect, vi } from 'vitest'

// Mock component system to avoid DOM/custom-element dependency
vi.mock('@rooted/components', () => ({
	component: vi.fn((def: Record<string, unknown>) => ({ ...def, __isComponent: true })),
	GenericComponent: class MockGenericComponent {},
}))

vi.mock('@rooted/components/elements', () => ({
	create: vi.fn(() => ({ tagName: 'MOCK-GATE', __isMockElement: true })),
}))

vi.mock('../src/dev-helper.v2.mts', () => ({ dev: {} }))

import { gate } from '../src/gate.mts'
import { route } from '../src/route.mts'
import { token } from '../src/route.tokens.mts'
import { create } from '@rooted/components/elements'

const mockedCreate = vi.mocked(create)

describe('gate()', () => {
	test('returns the result of create()', () => {
		const TestRoute = route`/test/`({ resolve: async () => undefined })
		const result = gate(TestRoute, () => ({ tagName: 'DIV' }) as unknown as Element)
		expect(result).toEqual({ tagName: 'MOCK-GATE', __isMockElement: true })
	})

	test('passes routeReference to the Gate component options', () => {
		mockedCreate.mockClear()
		const TestRoute = route`/articles/${token('id', Number)}/`({ resolve: async () => undefined })
		const render = vi.fn()

		gate(TestRoute, render)

		expect(mockedCreate).toHaveBeenCalledOnce()
		const [, options] = mockedCreate.mock.calls[0]! as [unknown, { routeReference: unknown; renderGate: unknown }]
		expect(options.routeReference).toBe(TestRoute)
	})

	test('passes the render function as renderGate', () => {
		mockedCreate.mockClear()
		const TestRoute = route`/test/`({ resolve: async () => undefined })
		const render = vi.fn(() => ({ tagName: 'DIV' }) as unknown as Element)

		gate(TestRoute, render)

		const [, options] = mockedCreate.mock.calls[0]! as [unknown, { routeReference: unknown; renderGate: unknown }]
		expect(options.renderGate).toBe(render)
	})

	test('accepts a render function that returns an array', () => {
		const TestRoute = route`/test/`({ resolve: async () => undefined })
		const render = () => [{ tagName: 'A' }, { tagName: 'B' }] as unknown as Element[]
		// Should not throw — just verify it compiles and runs
		expect(() => gate(TestRoute, render)).not.toThrow()
	})

	test('accepts an async render function', () => {
		const TestRoute = route`/test/`({ resolve: async () => undefined })
		const render = async () => ({ tagName: 'DIV' }) as unknown as Element
		expect(() => gate(TestRoute, render)).not.toThrow()
	})
})
