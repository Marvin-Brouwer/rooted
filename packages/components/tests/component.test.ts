import { describe, expect, test, vi } from 'vitest'

// Mock dev-helper to avoid DOM dependency (validateComponentName uses document.createElement)
vi.mock('../src/dev-helper.mts', () => ({ devHelper: {} }))

import { component, definedAt, isComponent } from '../src/component.mts'

describe('isComponent', () => {
	test('returns false for null', () => {
		// eslint-disable-next-line unicorn/no-null
		expect(isComponent(null)).toBe(false)
	})

	test('returns false for undefined', () => {
		// eslint-disable-next-line unicorn/no-useless-undefined
		expect(isComponent(undefined)).toBe(false)
	})

	test('returns false for a number', () => {
		expect(isComponent(42)).toBe(false)
	})

	test('returns false for a plain object', () => {
		expect(isComponent({})).toBe(false)
	})

	test('returns false for a ComponentConstructor-shaped object without the brand', () => {
		expect(isComponent({ name: 'test', onMount: () => {} })).toBe(false)
	})

	test('returns true for the result of component()', () => {
		const c = component({ name: 'my-component', onMount() {} })
		expect(isComponent(c)).toBe(true)
	})
})

describe('component', () => {
	test('return value passes isComponent()', () => {
		const c = component({ name: 'branded', onMount() {} })
		expect(isComponent(c)).toBe(true)
	})

	test('definedAt is undefined when devHelper.appendSourceLocation is absent', () => {
		// The mock returns devHelper: {} so appendSourceLocation?.() is undefined
		const ctor = { name: 'no-location', onMount() {} }
		component(ctor)
		expect(ctor[definedAt]).toBeUndefined()
	})

	test('original constructor reference is the returned component', () => {
		const ctor = { name: 'same-ref', onMount() {} }
		const result = component(ctor)
		// component() uses Object.assign which returns the original constructor
		expect(result).toBe(ctor as any)
	})

	test('preserves name and onMount on the returned object', () => {
		const onMount = () => {}
		const c = component({ name: 'preserved', onMount })
		expect(c.name).toBe('preserved')
		expect(c.onMount).toBe(onMount)
	})
})
