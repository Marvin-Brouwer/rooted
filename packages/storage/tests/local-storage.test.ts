import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { localStorage } from '../src/web/local-storage/local-storage.mts'

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

function restoreLocalStorage(): void {
	if (originalLocalStorageDescriptor) {
		Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor)
	}
}

beforeEach(() => {
	restoreLocalStorage()
	globalThis.localStorage.clear()
})

afterEach(() => {
	restoreLocalStorage()
	globalThis.localStorage.clear()
})

describe('localStorage — getItem / setItem', () => {
	test('getItem returns undefined for a missing key', () => {
		expect(localStorage.getItem('missing')).toBeUndefined()
	})

	test('setItem + getItem round-trip a plain string', () => {
		localStorage.setItem('token', 'abc123')
		expect(localStorage.getItem('token')).toBe('abc123')
	})

	test('setItem overwrites previous value', () => {
		localStorage.setItem('k', 'first')
		localStorage.setItem('k', 'second')
		expect(localStorage.getItem('k')).toBe('second')
	})

	test('handles special characters in key and value', () => {
		localStorage.setItem('key with spaces', 'value; with=specials & unicode é')
		expect(localStorage.getItem('key with spaces'))
			.toBe('value; with=specials & unicode é')
	})

	test('writes go through to the native localStorage', () => {
		localStorage.setItem('shared', 'hello')
		expect(globalThis.localStorage.getItem('shared')).toBe('hello')
	})
})

describe('localStorage — typed get / set', () => {
	test('set<number> + get<number>', () => {
		localStorage.set<number>('count', 42)
		expect(localStorage.get<number>('count')).toBe(42)
	})

	test('set<boolean> + get<boolean>', () => {
		localStorage.set<boolean>('flag', true)
		expect(localStorage.get<boolean>('flag')).toBe(true)
	})

	test('set<object> + get<object> round-trip', () => {
		const value = { id: 1, name: 'rooted', tags: ['a', 'b'] }
		localStorage.set('profile', value)
		expect(localStorage.get<typeof value>('profile')).toEqual(value)
	})

	test('set<string> does not double-encode', () => {
		localStorage.set<string>('greeting', 'hello')
		expect(localStorage.getItem('greeting')).toBe('hello')
		expect(localStorage.get<string>('greeting')).toBe('hello')
	})

	test('get<string> falls back to the raw value when the stored value is not JSON', () => {
		// Simulates a value written via setItem (or from another tab)
		// that stores a plain non-JSON string.
		localStorage.setItem('opaque', 'opaque-token')
		expect(localStorage.get<string>('opaque')).toBe('opaque-token')
	})

	test('get returns undefined for a missing key', () => {
		expect(localStorage.get('missing')).toBeUndefined()
	})

	test('prototype-pollution guard: malicious value cannot pollute Object.prototype', () => {
		localStorage.setItem('evil', '{"__proto__":{"polluted":"yes"}}')

		const parsed = localStorage.get<Record<string, unknown>>('evil')
		expect(parsed).toEqual({})
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})
})

describe('localStorage — removeItem / clear', () => {
	test('removeItem drops a previously set value', () => {
		localStorage.setItem('temp', '1')
		expect(localStorage.getItem('temp')).toBe('1')

		localStorage.removeItem('temp')
		expect(localStorage.getItem('temp')).toBeUndefined()
	})

	test('clear wipes every key', () => {
		localStorage.setItem('a', '1')
		localStorage.setItem('b', '2')

		localStorage.clear()

		expect(localStorage.getItem('a')).toBeUndefined()
		expect(localStorage.getItem('b')).toBeUndefined()
		expect(localStorage.keys()).toEqual([])
	})
})

describe('localStorage — keys', () => {
	test('returns every key currently stored', () => {
		localStorage.setItem('a', '1')
		localStorage.setItem('b', '2')
		localStorage.setItem('c', '3')

		expect(localStorage.keys().toSorted()).toEqual(['a', 'b', 'c'])
	})

	test('returns an empty array when nothing is stored', () => {
		expect(localStorage.keys()).toEqual([])
	})
})

describe('localStorage — inherited Storage surface', () => {
	test('length reflects the number of stored entries', () => {
		expect(localStorage.length).toBe(0)

		localStorage.setItem('a', '1')
		localStorage.setItem('b', '2')

		expect(localStorage.length).toBe(2)
	})

	test('key(index) returns keys in the native order', () => {
		localStorage.setItem('a', '1')
		localStorage.setItem('b', '2')

		const first = localStorage.key(0)
		const second = localStorage.key(1)

		expect([first, second].toSorted()).toEqual(['a', 'b'])
		expect(localStorage.key(99)).toBeUndefined()
	})
})

describe('localStorage — SSR guard', () => {
	test('does not throw when globalThis.localStorage is undefined', () => {
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			value: undefined,
		})

		try {
			expect(localStorage.getItem('x')).toBeUndefined()
			expect(localStorage.get('x')).toBeUndefined()
			expect(localStorage.keys()).toEqual([])
			expect(localStorage.length).toBe(0)
			expect(localStorage.key(0)).toBeUndefined()
			expect(() => localStorage.setItem('x', '1')).not.toThrow()
			expect(() => localStorage.set('x', 1)).not.toThrow()
			expect(() => localStorage.removeItem('x')).not.toThrow()
			expect(() => localStorage.clear()).not.toThrow()
		}
		finally {
			restoreLocalStorage()
		}
	})
})

describe('localStorage — singleton', () => {
	test('is frozen so methods cannot be replaced', () => {
		expect(Object.isFrozen(localStorage)).toBe(true)
	})
})
