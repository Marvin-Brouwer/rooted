import { describe, expect, test } from 'vitest'

import { choice } from '../src/choice.mts'

describe('choice', () => {
	test('returns the matched value when the condition is true', () => {
		// Act
		const result = choice(true, 'matched', 'not matched')

		// Assert
		expect(result).toBe('matched')
	})

	test('returns the other value when the condition is false', () => {
		// Act
		const result = choice(false, 'matched', 'not matched')

		// Assert
		expect(result).toBe('not matched')
	})

	test('returns the other value when the condition is null', () => {
		// Act
		const result = choice(null, 'matched', 'not matched')

		// Assert
		expect(result).toBe('not matched')
	})

	test('returns the other value when the condition is undefined', () => {
		// Act
		const result = choice(undefined, 'matched', 'not matched')

		// Assert
		expect(result).toBe('not matched')
	})

	test('returns the matched value by reference', () => {
		// Arrange
		const matched = { name: 'rooted' }

		// Act
		const result = choice(true, matched, { name: 'other' })

		// Assert
		expect(result).toBe(matched)
	})

	test('returns the other value by reference', () => {
		// Arrange
		const notMatched = { name: 'rooted' }

		// Act
		const result = choice(false, { name: 'other' }, notMatched)

		// Assert
		expect(result).toBe(notMatched)
	})

	test('returns falsy matched values as-is', () => {
		// Act
		const result = choice(true, 0, 1)

		// Assert
		expect(result).toBe(0)
	})

	test('returns falsy other values as-is', () => {
		// Act
		const result = choice(false, 1, 0)

		// Assert
		expect(result).toBe(0)
	})

	test('returns undefined when that is the value picked', () => {
		// Act
		const result = choice(false, 'page', undefined)

		// Assert
		expect(result).toBeUndefined()
	})
})
