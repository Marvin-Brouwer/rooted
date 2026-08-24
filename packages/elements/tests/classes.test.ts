import { describe, expect, test } from 'vitest'

import { cssClass, cssClasses } from '../src/classes.mts'

describe('cssClass', () => {
	test('returns the class when called without a condition', () => {
		// Act
		const result = cssClass('btn')

		// Assert
		expect(result).toBe('btn')
	})

	test('returns undefined when called without a condition on a missing class', () => {
		// Act
		const result = cssClass(undefined)

		// Assert
		expect(result).toBeUndefined()
	})

	test('returns the class when the condition is true', () => {
		// Act
		const result = cssClass(true, 'btn--active')

		// Assert
		expect(result).toBe('btn--active')
	})

	test('returns undefined when the condition is false', () => {
		// Act
		const result = cssClass(false, 'btn--active')

		// Assert
		expect(result).toBeUndefined()
	})

	test('returns undefined when the condition is null', () => {
		// Act
		const result = cssClass(null, 'btn--active')

		// Assert
		expect(result).toBeUndefined()
	})

	test('returns undefined when the condition is undefined', () => {
		// Act
		const result = cssClass(undefined, 'btn--active')

		// Assert
		expect(result).toBeUndefined()
	})
})

describe('cssClasses', () => {
	test('joins the class names it is given', () => {
		// Act
		const result = cssClasses('btn', 'btn--large')

		// Assert
		expect(result).toBe('btn btn--large')
	})

	test('drops falsy class names', () => {
		// Act
		const result = cssClasses('btn', undefined, null, '', 'btn--large')

		// Assert
		expect(result).toBe('btn btn--large')
	})

	test('returns undefined when nothing is left to join', () => {
		// Act
		const result = cssClasses(undefined, null)

		// Assert
		expect(result).toBeUndefined()
	})

	test('joins the class names when the condition is true', () => {
		// Act
		const result = cssClasses(true, 'btn--active', 'btn--raised')

		// Assert
		expect(result).toBe('btn--active btn--raised')
	})

	test('returns undefined when the condition is false', () => {
		// Act
		const result = cssClasses(false, 'btn--active', 'btn--raised')

		// Assert
		expect(result).toBeUndefined()
	})

	test('reads a leading undefined as the condition, not as a class name', () => {
		// Act
		const result = cssClasses(undefined, 'btn--active')

		// Assert
		expect(result).toBeUndefined()
	})

	test('keeps the dictionary keys mapped to true', () => {
		// Act
		const result = cssClasses({ 'btn': true, 'btn--active': true, 'btn--disabled': false })

		// Assert
		expect(result).toBe('btn btn--active')
	})

	test('ignores dictionary keys that are not exactly true', () => {
		// Act
		const result = cssClasses({ 'btn': true, 'btn--active': undefined, 'btn--disabled': null })

		// Assert
		expect(result).toBe('btn')
	})

	test('returns undefined for a dictionary with nothing enabled', () => {
		// Act
		const result = cssClasses({ 'btn--active': false })

		// Assert
		expect(result).toBeUndefined()
	})
})
