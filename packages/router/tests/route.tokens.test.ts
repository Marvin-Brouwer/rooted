import { describe, test, expect } from 'vitest'

import { token, wildcard, isParameterToken, isWildcardParameter, isConstantParameter } from '../src/route.tokens.mts'

describe('token()', () => {
	test('creates a token with the given key', () => {
		// Act
		const t = token('id', Number)

		// Assert
		expect(t.key).toBe('id')
	})

	test('isParameterToken returns true', () => {
		// Act
		const result = isParameterToken(token('id', Number))

		// Assert
		expect(result).toBe(true)
	})

	test('isWildcardParameter returns false for a token', () => {
		// Act
		const result = isWildcardParameter(token('id', Number))

		// Assert
		expect(result).toBe(false)
	})

	describe('Number', () => {
		test('valid integer', () => {
			// Act
			const result = token('id', Number).match('42')

			// Assert
			expect(result[0]).toBe(true)
			expect(result[1]).toBe(42)
		})

		test('invalid string', () => {
			// Act
			const result = token('id', Number).match('abc')[0]

			// Assert
			expect(result).toBe(false)
		})

		test('decimal number', () => {
			// Act
			const result = token('x', Number).match('3.14')

			// Assert
			expect(result[0]).toBe(true)
			expect(result[1]).toBe(3.14)
		})
	})

	describe('Boolean', () => {
		test('"true" → true', () => {
			// Act
			const result = token('f', Boolean).match('true')[1]

			// Assert
			expect(result).toBe(true)
		})

		test('"1" → true', () => {
			// Act
			const result = token('f', Boolean).match('1')[1]

			// Assert
			expect(result).toBe(true)
		})

		test('"false" → false', () => {
			// Act
			const result = token('f', Boolean).match('false')[1]

			// Assert
			expect(result).toBe(false)
		})

		test('"0" → false', () => {
			// Act
			const result = token('f', Boolean).match('0')[1]

			// Assert
			expect(result).toBe(false)
		})

		test('invalid → error', () => {
			// Act
			const result = token('f', Boolean).match('xyz')[0]

			// Assert
			expect(result).toBe(false)
		})
	})

	describe('String', () => {
		test('always succeeds', () => {
			// Act
			const result = token('s', String).match('hello-world')

			// Assert
			expect(result[0]).toBe(true)
			expect(result[1]).toBe('hello-world')
		})
	})

	describe('Date', () => {
		test('valid date string', () => {
			// Act
			const result = token('d', Date).match('2024-01-01')

			// Assert
			expect(result[0]).toBe(true)
			expect(result[1]).toBeInstanceOf(Date)
		})

		test('invalid date', () => {
			// Act
			const result = token('d', Date).match('not-a-date')[0]

			// Assert
			expect(result).toBe(false)
		})
	})

	describe('Constant values', () => {
		test('matches a listed string value', () => {
			// Act
			const result = token('locale', ['en-GB', 'nl-NL']).match('nl-NL')

			// Assert
			expect(result[0]).toBe(true)
			expect(result[1]).toBe('nl-NL')
		})

		test('rejects a value outside the list', () => {
			// Act
			const result = token('locale', ['en-GB', 'nl-NL']).match('de-DE')[0]

			// Assert
			expect(result).toBe(false)
		})

		test('matches a listed number value and preserves the number type', () => {
			// Act
			const result = token('version', [1, 2]).match('2')

			// Assert
			expect(result[0]).toBe(true)
			expect(result[1]).toBe(2)
		})

		test('rejects a number outside the list', () => {
			// Act
			const result = token('version', [1, 2]).match('3')[0]

			// Assert
			expect(result).toBe(false)
		})

		test('accepts its own matched output again (href.for round-trip)', () => {
			// Arrange
			const t = token('locale', ['en-GB', 'nl-NL'])

			// Act
			const first = t.match('en-GB')

			// Assert
			expect(first[0]).toBe(true)
			expect(t.match(first[1] as string)[0]).toBe(true)
		})

		test('isConstantParameter returns true', () => {
			// Act
			const result = isConstantParameter(token('locale', ['en-GB', 'nl-NL']))

			// Assert
			expect(result).toBe(true)
		})

		test('isParameterToken returns true', () => {
			// Act
			const result = isParameterToken(token('locale', ['en-GB', 'nl-NL']))

			// Assert
			expect(result).toBe(true)
		})

		test('isWildcardParameter returns false', () => {
			// Act
			const result = isWildcardParameter(token('locale', ['en-GB', 'nl-NL']))

			// Assert
			expect(result).toBe(false)
		})
	})
})

describe('wildcard()', () => {
	test('default key is "rest"', () => {
		// Act
		const result = wildcard().key

		// Assert
		expect(result).toBe('rest')
	})

	test('custom key', () => {
		// Act
		const result = wildcard('slug').key

		// Assert
		expect(result).toBe('slug')
	})

	test('match always succeeds and returns the raw string', () => {
		// Act
		const result = wildcard().match('some-segment')

		// Assert
		expect(result[0]).toBe(true)
		expect(result[1]).toBe('some-segment')
	})

	test('isWildcardParameter returns true', () => {
		// Act
		const result = isWildcardParameter(wildcard())

		// Assert
		expect(result).toBe(true)
	})

	test('isParameterToken returns true', () => {
		// Act
		const result = isParameterToken(wildcard())

		// Assert
		expect(result).toBe(true)
	})
})

describe('isParameterToken()', () => {
	test('returns false for null', () => {
		// Act
		const result = isParameterToken(null)

		// Assert
		expect(result).toBe(false)
	})
	test('returns false for undefined', () => {
		// Act
		const result = isParameterToken(void 0)

		// Assert
		expect(result).toBe(false)
	})
	test('returns false for plain object', () => {
		// Act
		const result = isParameterToken({})

		// Assert
		expect(result).toBe(false)
	})
	test('returns false for a string', () => {
		// Act
		const result = isParameterToken('hello')

		// Assert
		expect(result).toBe(false)
	})
	test('returns true for token result', () => {
		// Act
		const result = isParameterToken(token('x', String))

		// Assert
		expect(result).toBe(true)
	})
	test('returns true for wildcard result', () => {
		// Act
		const result = isParameterToken(wildcard())

		// Assert
		expect(result).toBe(true)
	})
})

describe('isWildcardParameter()', () => {
	test('returns false for a token', () => {
		// Act
		const result = isWildcardParameter(token('x', String))

		// Assert
		expect(result).toBe(false)
	})
	test('returns true for a wildcard', () => {
		// Act
		const result = isWildcardParameter(wildcard())

		// Assert
		expect(result).toBe(true)
	})
	test('returns true for a named wildcard', () => {
		// Act
		const result = isWildcardParameter(wildcard('q'))

		// Assert
		expect(result).toBe(true)
	})
})

describe('isConstantParameter()', () => {
	test('returns false for a typed token', () => {
		// Act
		const result = isConstantParameter(token('x', String))

		// Assert
		expect(result).toBe(false)
	})
	test('returns false for a wildcard', () => {
		// Act
		const result = isConstantParameter(wildcard())

		// Assert
		expect(result).toBe(false)
	})
	test('returns true for a constant token', () => {
		// Act
		const result = isConstantParameter(token('locale', ['en-GB']))

		// Assert
		expect(result).toBe(true)
	})
})
