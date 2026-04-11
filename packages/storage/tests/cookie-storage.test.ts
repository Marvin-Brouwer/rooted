import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { cookieStorage } from '../src/web/cookies/cookie-storage.mts'

function findCookieDescriptor(): PropertyDescriptor {
	let object: object | null = document
	while (object) {
		const descriptor = Object.getOwnPropertyDescriptor(object, 'cookie')
		if (descriptor) return descriptor
		object = Object.getPrototypeOf(object) as object | null
	}
	throw new Error('document.cookie descriptor not found')
}

const originalCookieDescriptor = findCookieDescriptor()

function restoreCookieProperty(): void {
	// Drop any per-test override placed directly on `document`, then fall
	// back to the prototype-level descriptor we captured on import.
	if (Object.getOwnPropertyDescriptor(document, 'cookie')) {
		delete (document as unknown as Record<string, unknown>).cookie
	}
	// If the prototype descriptor is still in place we're done; otherwise
	// reinstall it on the instance as a safety net.
	if (!Object.getOwnPropertyDescriptor(document, 'cookie')) {
		const proto = Object.getPrototypeOf(document) as object | null
		if (!proto || !Object.getOwnPropertyDescriptor(proto, 'cookie')) {
			Object.defineProperty(document, 'cookie', {
				...originalCookieDescriptor,
				configurable: true,
			})
		}
	}
}

function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim()
		if (name) document.cookie = `${name}=; Expires=${new Date(0).toUTCString()}`
	}
}

beforeEach(() => {
	restoreCookieProperty()
	clearCookies()
})

afterEach(() => {
	restoreCookieProperty()
	clearCookies()
	vi.restoreAllMocks()
})

describe('cookieStorage — getItem / setItem', () => {
	test('getItem returns undefined for a missing cookie', () => {
		expect(cookieStorage.getItem('missing')).toBeUndefined()
	})

	test('setItem + getItem round-trip a plain string', () => {
		cookieStorage.setItem('token', 'abc123')
		expect(cookieStorage.getItem('token')).toBe('abc123')
	})

	test('setItem overwrites previous value', () => {
		cookieStorage.setItem('k', 'first')
		cookieStorage.setItem('k', 'second')
		expect(cookieStorage.getItem('k')).toBe('second')
	})

	test('handles special characters in name and value', () => {
		cookieStorage.setItem('key with spaces', 'value; with=specials & unicode é')
		expect(cookieStorage.getItem('key with spaces'))
			.toBe('value; with=specials & unicode é')
	})
})

describe('cookieStorage — typed get / set', () => {
	test('set<number> + get<number>', () => {
		cookieStorage.set<number>('count', 42)
		expect(cookieStorage.get<number>('count')).toBe(42)
	})

	test('set<boolean> + get<boolean>', () => {
		cookieStorage.set<boolean>('flag', true)
		expect(cookieStorage.get<boolean>('flag')).toBe(true)
	})

	test('set<object> + get<object> round-trip', () => {
		const value = { id: 1, name: 'rooted', tags: ['a', 'b'] }
		cookieStorage.set('profile', value)
		expect(cookieStorage.get<typeof value>('profile')).toEqual(value)
	})

	test('set<string> does not double-encode', () => {
		cookieStorage.set<string>('greeting', 'hello')
		expect(cookieStorage.getItem('greeting')).toBe('hello')
		expect(cookieStorage.get<string>('greeting')).toBe('hello')
	})

	test('get<string> falls back to the raw value when the cookie is not JSON', () => {
		// Simulates a cookie written by a server that stores a plain string.
		cookieStorage.setItem('server_token', 'opaque-server-token')
		expect(cookieStorage.get<string>('server_token')).toBe('opaque-server-token')
	})

	test('get returns undefined for a missing cookie', () => {
		expect(cookieStorage.get('missing')).toBeUndefined()
	})

	test('prototype-pollution guard: malicious cookie value cannot pollute Object.prototype', () => {
		cookieStorage.setItem('evil', '{"__proto__":{"polluted":"yes"}}')

		const parsed = cookieStorage.get<Record<string, unknown>>('evil')
		expect(parsed).toEqual({})
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})
})

describe('cookieStorage — set with CookieInit', () => {
	test('writes the full attribute set via document.cookie', () => {
		const setter = vi.fn<(value: string) => void>()
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => '',
			set: setter,
		})

		cookieStorage.set({
			name: 'session',
			value: { userId: 7 },
			domain: 'example.com',
			path: '/',
			expires: Date.UTC(2030, 0, 1),
			sameSite: 'none',
		})

		expect(setter).toHaveBeenCalledTimes(1)
		const written = setter.mock.calls[0][0]
		expect(written).toContain('session=')
		expect(written).toContain(encodeURIComponent('{"userId":7}'))
		expect(written).toContain('Domain=example.com')
		expect(written).toContain('Path=/')
		expect(written).toContain('Expires=')
		expect(written).toContain('SameSite=None')
		expect(written).toContain('Secure')
	})

	test('string values are not JSON-wrapped in the CookieInit form', () => {
		const setter = vi.fn<(value: string) => void>()
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => '',
			set: setter,
		})

		cookieStorage.set({ name: 'x', value: 'plain' })

		expect(setter.mock.calls[0][0]).toBe('x=plain')
	})
})

describe('cookieStorage — removeItem', () => {
	test('removes a previously set cookie', () => {
		cookieStorage.setItem('temp', '1')
		expect(cookieStorage.getItem('temp')).toBe('1')

		cookieStorage.removeItem('temp')
		expect(cookieStorage.getItem('temp')).toBeUndefined()
	})

	test('removeItem writes an expired cookie string', () => {
		const setter = vi.fn<(value: string) => void>()
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => '',
			set: setter,
		})

		cookieStorage.removeItem('session', { path: '/', domain: 'example.com' })

		const written = setter.mock.calls[0][0]
		expect(written).toContain('session=')
		expect(written).toContain('Domain=example.com')
		expect(written).toContain('Path=/')
		expect(written).toContain(`Expires=${new Date(0).toUTCString()}`)
	})
})

describe('cookieStorage — names / all', () => {
	test('names returns every cookie name currently set', () => {
		cookieStorage.setItem('a', '1')
		cookieStorage.setItem('b', '2')
		cookieStorage.setItem('c', '3')

		expect(cookieStorage.names().toSorted()).toEqual(['a', 'b', 'c'])
	})

	test('all returns a Map of raw values', () => {
		cookieStorage.setItem('a', '1')
		cookieStorage.setItem('b', 'two')

		const map = cookieStorage.all()
		expect(map).toBeInstanceOf(Map)
		expect(map.get('a')).toBe('1')
		expect(map.get('b')).toBe('two')
	})

	test('all returns an empty Map when no cookies are set', () => {
		expect(cookieStorage.all().size).toBe(0)
		expect(cookieStorage.names()).toEqual([])
	})
})

describe('cookieStorage — SSR guard', () => {
	test('does not throw when document is undefined', () => {
		const originalDocument = globalThis.document
		;(globalThis as { document?: Document }).document = undefined

		try {
			expect(cookieStorage.getItem('x')).toBeUndefined()
			expect(cookieStorage.get('x')).toBeUndefined()
			expect(cookieStorage.names()).toEqual([])
			expect(cookieStorage.all().size).toBe(0)
			expect(() => cookieStorage.setItem('x', '1')).not.toThrow()
			expect(() => cookieStorage.set('x', 1)).not.toThrow()
			expect(() => cookieStorage.set({ name: 'x', value: '1' })).not.toThrow()
			expect(() => cookieStorage.removeItem('x')).not.toThrow()
		}
		finally {
			globalThis.document = originalDocument
		}
	})
})

describe('cookieStorage — singleton', () => {
	test('is frozen so methods cannot be replaced', () => {
		expect(Object.isFrozen(cookieStorage)).toBe(true)
	})
})
