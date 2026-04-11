import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { sessionStorage } from '../src/web/local-storage/session-storage.mts'

const originalSessionStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')

function restoreSessionStorage(): void {
	if (originalSessionStorageDescriptor) {
		Object.defineProperty(globalThis, 'sessionStorage', originalSessionStorageDescriptor)
	}
}

beforeEach(() => {
	restoreSessionStorage()
	globalThis.sessionStorage.clear()
})

afterEach(() => {
	restoreSessionStorage()
	globalThis.sessionStorage.clear()
})

describe('sessionStorage — getItem / setItem', () => {
	test('getItem returns undefined for a missing key', () => {
		expect(sessionStorage.getItem('missing')).toBeUndefined()
	})

	test('setItem + getItem round-trip a plain string', () => {
		sessionStorage.setItem('token', 'abc123')
		expect(sessionStorage.getItem('token')).toBe('abc123')
	})

	test('setItem overwrites previous value', () => {
		sessionStorage.setItem('k', 'first')
		sessionStorage.setItem('k', 'second')
		expect(sessionStorage.getItem('k')).toBe('second')
	})

	test('handles special characters in key and value', () => {
		sessionStorage.setItem('key with spaces', 'value; with=specials & unicode é')
		expect(sessionStorage.getItem('key with spaces'))
			.toBe('value; with=specials & unicode é')
	})

	test('writes go through to the native sessionStorage', () => {
		sessionStorage.setItem('shared', 'hello')
		expect(globalThis.sessionStorage.getItem('shared')).toBe('hello')
	})
})

describe('sessionStorage — typed get / set', () => {
	test('set<number> + get<number>', () => {
		sessionStorage.set<number>('count', 42)
		expect(sessionStorage.get<number>('count')).toBe(42)
	})

	test('set<boolean> + get<boolean>', () => {
		sessionStorage.set<boolean>('flag', true)
		expect(sessionStorage.get<boolean>('flag')).toBe(true)
	})

	test('set<object> + get<object> round-trip', () => {
		const value = { id: 1, name: 'rooted', tags: ['a', 'b'] }
		sessionStorage.set('profile', value)
		expect(sessionStorage.get<typeof value>('profile')).toEqual(value)
	})

	test('set<string> does not double-encode', () => {
		sessionStorage.set<string>('greeting', 'hello')
		expect(sessionStorage.getItem('greeting')).toBe('hello')
		expect(sessionStorage.get<string>('greeting')).toBe('hello')
	})

	test('get<string> falls back to the raw value when the stored value is not JSON', () => {
		// Simulates a value written via setItem (or from another tab)
		// that stores a plain non-JSON string.
		sessionStorage.setItem('opaque', 'opaque-token')
		expect(sessionStorage.get<string>('opaque')).toBe('opaque-token')
	})

	test('get returns undefined for a missing key', () => {
		expect(sessionStorage.get('missing')).toBeUndefined()
	})

	test('prototype-pollution guard: malicious value cannot pollute Object.prototype', () => {
		sessionStorage.setItem('evil', '{"__proto__":{"polluted":"yes"}}')

		const parsed = sessionStorage.get<Record<string, unknown>>('evil')
		expect(parsed).toEqual({})
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})
})

describe('sessionStorage — removeItem / clear', () => {
	test('removeItem drops a previously set value', () => {
		sessionStorage.setItem('temp', '1')
		expect(sessionStorage.getItem('temp')).toBe('1')

		sessionStorage.removeItem('temp')
		expect(sessionStorage.getItem('temp')).toBeUndefined()
	})

	test('clear wipes every key', () => {
		sessionStorage.setItem('a', '1')
		sessionStorage.setItem('b', '2')

		sessionStorage.clear()

		expect(sessionStorage.getItem('a')).toBeUndefined()
		expect(sessionStorage.getItem('b')).toBeUndefined()
		expect(sessionStorage.keys()).toEqual([])
	})
})

describe('sessionStorage — keys', () => {
	test('returns every key currently stored', () => {
		sessionStorage.setItem('a', '1')
		sessionStorage.setItem('b', '2')
		sessionStorage.setItem('c', '3')

		expect(sessionStorage.keys().toSorted()).toEqual(['a', 'b', 'c'])
	})

	test('returns an empty array when nothing is stored', () => {
		expect(sessionStorage.keys()).toEqual([])
	})
})

describe('sessionStorage — inherited Storage surface', () => {
	test('length reflects the number of stored entries', () => {
		expect(sessionStorage.length).toBe(0)

		sessionStorage.setItem('a', '1')
		sessionStorage.setItem('b', '2')

		expect(sessionStorage.length).toBe(2)
	})

	test('key(index) returns keys in the native order', () => {
		sessionStorage.setItem('a', '1')
		sessionStorage.setItem('b', '2')

		const first = sessionStorage.key(0)
		const second = sessionStorage.key(1)

		expect([first, second].toSorted()).toEqual(['a', 'b'])
		expect(sessionStorage.key(99)).toBeUndefined()
	})
})

describe('sessionStorage — SSR guard', () => {
	test('does not throw when globalThis.sessionStorage is undefined', () => {
		Object.defineProperty(globalThis, 'sessionStorage', {
			configurable: true,
			value: undefined,
		})

		try {
			expect(sessionStorage.getItem('x')).toBeUndefined()
			expect(sessionStorage.get('x')).toBeUndefined()
			expect(sessionStorage.keys()).toEqual([])
			expect(sessionStorage.length).toBe(0)
			expect(sessionStorage.key(0)).toBeUndefined()
			expect(() => sessionStorage.setItem('x', '1')).not.toThrow()
			expect(() => sessionStorage.set('x', 1)).not.toThrow()
			expect(() => sessionStorage.removeItem('x')).not.toThrow()
			expect(() => sessionStorage.clear()).not.toThrow()
		}
		finally {
			restoreSessionStorage()
		}
	})
})

describe('sessionStorage — singleton', () => {
	test('is frozen so methods cannot be replaced', () => {
		expect(Object.isFrozen(sessionStorage)).toBe(true)
	})
})
