import { describe, expect, test } from 'vitest'

import { match } from '../src/match.mts'

describe('match', () => {
	test('returns the entry the string key points at', () => {
		// Act
		const result = match('review' as 'draft' | 'review', {
			draft: 'Not shared yet',
			review: 'Waiting on a reviewer',
		})

		// Assert
		expect(result).toBe('Waiting on a reviewer')
	})

	test('returns the entry the number key points at', () => {
		// Act
		const result = match(2 as 1 | 2 | 3, {
			1: 'low',
			2: 'mid',
			3: 'high',
		})

		// Assert
		expect(result).toBe('mid')
	})

	test('returns the entry by reference', () => {
		// Arrange
		const published = { label: 'Live' }

		// Act
		const result = match('published' as 'draft' | 'published', {
			draft: { label: 'Not shared yet' },
			published,
		})

		// Assert
		expect(result).toBe(published)
	})

	test('returns undefined for a key the record does not cover', () => {
		// Arrange
		const options = { draft: 'Not shared yet' } as Record<string, string>

		// Act
		const result = match('published', options)

		// Assert
		expect(result).toBeUndefined()
	})

	test('reads an array by index', () => {
		// Act
		const result = match(1, ['first', 'second', 'third'])

		// Assert
		expect(result).toBe('second')
	})

	test('returns undefined for an index past the end of the array', () => {
		// Act
		const result = match(3, ['first', 'second', 'third'])

		// Assert
		expect(result).toBeUndefined()
	})

	test('returns undefined for a negative index', () => {
		// Act
		const result = match(-1, ['first', 'second', 'third'])

		// Assert
		expect(result).toBeUndefined()
	})

	test('reads an array of objects as an array, not as a record', () => {
		// Arrange
		const second = { name: 'second' }

		// Act
		const result = match(1, [{ name: 'first' }, second])

		// Assert
		expect(result).toBe(second)
	})

	test('returns falsy entries as-is', () => {
		// Act
		const result = match(0, [0, 1])

		// Assert
		expect(result).toBe(0)
	})
})
