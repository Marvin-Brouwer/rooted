import { afterEach, describe, expect, test } from 'vitest'

import { definePrerendering, environment } from '../src/environment.mts'

afterEach(() => {
	definePrerendering(false)
})

describe('environment, in a browser-like environment', () => {
	test('reports the client', () => {
		// Assert
		expect(environment.value).toBe('client')
		expect(environment.is('client')).toBe(true)
		expect(environment.is('preRenderer')).toBe(false)
		expect(environment.is('server')).toBe(false)
	})

	test('has a DOM', () => {
		// Assert
		expect(environment.hasDom).toBe(true)
	})
})

describe('environment, once the build marks the pre-render', () => {
	test('reports the pre-renderer, not the client', () => {
		// Act
		definePrerendering(true)

		// Assert
		expect(environment.value).toBe('preRenderer')
		expect(environment.is('preRenderer')).toBe(true)
		expect(environment.is('client')).toBe(false)
		expect(environment.is('server')).toBe(false)
	})

	test('still has a DOM, because the pre-render installs one', () => {
		// Act
		definePrerendering(true)

		// Assert
		expect(environment.hasDom).toBe(true)
	})

	test('goes back to the client once the mark is cleared', () => {
		// Arrange
		definePrerendering(true)

		// Act
		definePrerendering(false)

		// Assert
		expect(environment.value).toBe('client')
	})

	test('leaves nothing behind on globalThis', () => {
		// Arrange
		definePrerendering(true)

		// Act
		definePrerendering(false)

		// Assert
		expect(Object.hasOwn(globalThis, '__rooted_environment')).toBe(false)
	})
})
