import { describe, expect, test, vi } from 'vitest'

vi.mock('@rooted/components', () => ({
	component: (c: object) => c,
	isComponent: () => false,
}))

import { gate, junction, typedParameter } from '../src/gate-factory.mts'
import { isGate } from '../src/router.mts'
import type { ComponentConstructor } from '@rooted/components'

function mockComponent(name: string): ComponentConstructor {
	return { name, onMount: () => {} }
}

describe('isGate', () => {
	test('returns false for a plain object', () => {
		expect(isGate({} as any)).toBe(false)
	})

	test('returns false for a ComponentConstructor without the gate symbol', () => {
		expect(isGate(mockComponent('plain') as any)).toBe(false)
	})

	test('returns true for an object with typedParameter manually attached', () => {
		const obj = Object.assign({}, { [typedParameter]: [] })
		expect(isGate(obj as any)).toBe(true)
	})

	test('returns true for a gate produced by gate``()', () => {
		const g = gate`/route/`(mockComponent('test-gate'))
		expect(isGate(g)).toBe(true)
	})

	test('returns true for a junction produced by junction``()', () => {
		const g = junction`/route/`(mockComponent('junction-gate'))
		expect(isGate(g)).toBe(true)
	})
})
