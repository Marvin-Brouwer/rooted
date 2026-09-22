import { afterEach, describe, expect, test, vi } from 'vitest'

import { environment } from '../src/environment.mts'

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('environment, under happy-dom', () => {
	test('reports the pre-renderer, because that is what the build pre-renders in', () => {
		// Assert
		expect(environment.value).toBe('preRenderer')
		expect(environment.is('preRenderer')).toBe(true)
		expect(environment.is('client')).toBe(false)
		expect(environment.is('server')).toBe(false)
	})

	test('has a DOM', () => {
		// Assert
		expect(environment.hasDom).toBe(true)
	})
})

describe('environment, with happy-dom mocked away', () => {
	test('reports the client', () => {
		// Act: a window without happyDOM on it is what a real browser looks like
		vi.stubGlobal('window', { addEventListener() {} })

		// Assert
		expect(environment.value).toBe('client')
		expect(environment.is('client')).toBe(true)
		expect(environment.is('preRenderer')).toBe(false)
	})

	test('still has a DOM', () => {
		// Act
		vi.stubGlobal('window', {})

		// Assert
		expect(environment.hasDom).toBe(true)
	})

	test('goes back to the pre-renderer once the stub is dropped', () => {
		// Arrange
		vi.stubGlobal('window', {})
		expect(environment.value).toBe('client')

		// Act
		vi.unstubAllGlobals()

		// Assert
		expect(environment.value).toBe('preRenderer')
	})
})
