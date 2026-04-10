import { describe, expect, test } from 'vitest'

import { jsonStringify, safeJsonParse, safeReviver } from '../src/web/cookie-serialize.mts'

describe('safeReviver', () => {
	test('returns primitive values unchanged', () => {
		expect(safeReviver('x', 1)).toBe(1)
		expect(safeReviver('x', 'hello')).toBe('hello')
		expect(safeReviver('x', true)).toBe(true)
		expect(safeReviver('x', undefined)).toBeUndefined()
	})

	test('strips __proto__, constructor, prototype at the top level', () => {
		expect(safeReviver('__proto__', { polluted: true })).toBeUndefined()
		expect(safeReviver('constructor', { polluted: true })).toBeUndefined()
		expect(safeReviver('prototype', { polluted: true })).toBeUndefined()
	})
})

describe('safeJsonParse', () => {
	test('parses valid JSON', () => {
		expect(safeJsonParse<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
		expect(safeJsonParse<number>('42')).toBe(42)
		expect(safeJsonParse<string>('"hello"')).toBe('hello')
	})

	test('returns undefined for invalid JSON (does not throw)', () => {
		expect(safeJsonParse('not json at all')).toBeUndefined()
		expect(safeJsonParse('{unterminated')).toBeUndefined()
	})

	test('prototype-pollution guard: __proto__ payload does not pollute Object.prototype', () => {
		const payload = '{"__proto__":{"polluted":"yes"}}'
		const parsed = safeJsonParse<Record<string, unknown>>(payload)

		expect(parsed).toEqual({})
		expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype)
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})

	test('prototype-pollution guard: nested __proto__ is stripped', () => {
		const payload = '{"nested":{"__proto__":{"polluted":"yes"},"keep":1}}'
		const parsed = safeJsonParse<{ nested: { keep: number, polluted?: string } }>(payload)

		expect(parsed?.nested.keep).toBe(1)
		expect(parsed?.nested.polluted).toBeUndefined()
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})

	test('prototype-pollution guard: constructor payload is stripped', () => {
		const payload = '{"constructor":{"prototype":{"polluted":"yes"}}}'
		const parsed = safeJsonParse<Record<string, unknown>>(payload)

		expect(parsed).toEqual({})
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})
})

describe('jsonStringify', () => {
	test('serialises primitives and objects', () => {
		expect(jsonStringify(42)).toBe('42')
		expect(jsonStringify('hi')).toBe('"hi"')
		expect(jsonStringify({ a: 1 })).toBe('{"a":1}')
	})
})
