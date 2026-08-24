import { describe, expect, test } from 'vitest'

import { optional } from '../src/optional.mts'

describe('optional', () => {
	test('returns the value when the condition is true', () => {
		// Act
		const result = optional(true, 'value')

		// Assert
		expect(result).toBe('value')
	})

	test('returns undefined when the condition is false', () => {
		// Act
		const result = optional(false, 'value')

		// Assert
		expect(result).toBeUndefined()
	})

	test('returns undefined when the condition is null', () => {
		// Act
		const result = optional(null, 'value')

		// Assert
		expect(result).toBeUndefined()
	})

	test('returns undefined when the condition is undefined', () => {
		// Act
		const result = optional(undefined, 'value')

		// Assert
		expect(result).toBeUndefined()
	})

	test('returns the value by reference', () => {
		// Arrange
		const value = { name: 'rooted' }

		// Act
		const result = optional(true, value)

		// Assert
		expect(result).toBe(value)
	})

	test('returns falsy values as-is when the condition is true', () => {
		// Act
		const result = optional(true, 0)

		// Assert
		expect(result).toBe(0)
	})
})
