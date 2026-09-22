// @vitest-environment node
// Runs in plain Node on purpose: 'server' means "no DOM at all",
// and the default happy-dom environment reports the pre-renderer instead.
import { afterEach, describe, expect, test, vi } from 'vitest'

import { environment } from '../src/environment.mts'

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('environment, in plain Node', () => {
	test('the test environment really has no DOM', () => {
		// Assert
		expect(typeof window).toBe('undefined')
	})

	test('reports the server', () => {
		// Assert
		expect(environment.value).toBe('server')
		expect(environment.is('server')).toBe(true)
		expect(environment.is('client')).toBe(false)
		expect(environment.is('preRenderer')).toBe(false)
	})
})

describe('environment.hasDom', () => {
	test('follows a window appearing and disappearing, which is why it is an accessor', () => {
		// Arrange
		expect(environment.hasDom).toBe(false)

		// Act
		vi.stubGlobal('window', {})

		// Assert
		expect(environment.hasDom).toBe(true)
	})

	test('a window with happyDOM on it is the pre-renderer, without it the client', () => {
		// Act
		vi.stubGlobal('window', { happyDOM: {} })

		// Assert
		expect(environment.value).toBe('preRenderer')

		// Act
		vi.stubGlobal('window', {})

		// Assert
		expect(environment.value).toBe('client')
	})
})
