import { describe, test, expect } from 'vitest'
import { token, wildcard, isParameterToken, isWildcardParameter } from '../src/route.tokens.mts'

describe('token()', () => {
	test('creates a token with the given key', () => {
		const t = token('id', Number)
		expect(t.key).toBe('id')
	})

	test('isParameterToken returns true', () => {
		expect(isParameterToken(token('id', Number))).toBe(true)
	})

	test('isWildcardParameter returns false for a token', () => {
		expect(isWildcardParameter(token('id', Number))).toBe(false)
	})

	describe('Number', () => {
		test('valid integer', () => {
			const result = token('id', Number).match('42')
			expect(result[0]).toBe(true)
			expect(result[1]).toBe(42)
		})

		test('invalid string', () => {
			expect(token('id', Number).match('abc')[0]).toBe(false)
		})

		test('decimal number', () => {
			const result = token('x', Number).match('3.14')
			expect(result[0]).toBe(true)
			expect(result[1]).toBe(3.14)
		})
	})

	describe('Boolean', () => {
		test('"true" → true', () => {
			expect(token('f', Boolean).match('true')[1]).toBe(true)
		})

		test('"1" → true', () => {
			expect(token('f', Boolean).match('1')[1]).toBe(true)
		})

		test('"false" → false', () => {
			expect(token('f', Boolean).match('false')[1]).toBe(false)
		})

		test('"0" → false', () => {
			expect(token('f', Boolean).match('0')[1]).toBe(false)
		})

		test('invalid → error', () => {
			expect(token('f', Boolean).match('xyz')[0]).toBe(false)
		})
	})

	describe('String', () => {
		test('always succeeds', () => {
			const result = token('s', String).match('hello-world')
			expect(result[0]).toBe(true)
			expect(result[1]).toBe('hello-world')
		})
	})

	describe('Date', () => {
		test('valid date string', () => {
			const result = token('d', Date).match('2024-01-01')
			expect(result[0]).toBe(true)
			expect(result[1]).toBeInstanceOf(Date)
		})

		test('invalid date', () => {
			expect(token('d', Date).match('not-a-date')[0]).toBe(false)
		})
	})
})

describe('wildcard()', () => {
	test('default key is "rest"', () => {
		expect(wildcard().key).toBe('rest')
	})

	test('custom key', () => {
		expect(wildcard('slug').key).toBe('slug')
	})

	test('match always succeeds and returns the raw string', () => {
		const result = wildcard().match('some-segment')
		expect(result[0]).toBe(true)
		expect(result[1]).toBe('some-segment')
	})

	test('isWildcardParameter returns true', () => {
		expect(isWildcardParameter(wildcard())).toBe(true)
	})

	test('isParameterToken returns true', () => {
		expect(isParameterToken(wildcard())).toBe(true)
	})
})

describe('isParameterToken()', () => {
	test('returns false for null', () => expect(isParameterToken(null)).toBe(false))
	test('returns false for undefined', () => expect(isParameterToken(undefined)).toBe(false))
	test('returns false for plain object', () => expect(isParameterToken({})).toBe(false))
	test('returns false for a string', () => expect(isParameterToken('hello')).toBe(false))
	test('returns true for token result', () => expect(isParameterToken(token('x', String))).toBe(true))
	test('returns true for wildcard result', () => expect(isParameterToken(wildcard())).toBe(true))
})

describe('isWildcardParameter()', () => {
	test('returns false for a token', () => expect(isWildcardParameter(token('x', String))).toBe(false))
	test('returns true for a wildcard', () => expect(isWildcardParameter(wildcard())).toBe(true))
	test('returns true for a named wildcard', () => expect(isWildcardParameter(wildcard('q'))).toBe(true))
})
