// @vitest-environment node
// Runs in plain Node on purpose: 'server' means "no DOM and not the pre-render",
// so under happy-dom there is no way to reach it.
import { afterEach, describe, expect, test, vi } from 'vitest'

import { definePrerendering, environment } from '../src/environment.mts'

afterEach(() => {
	definePrerendering(false)
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

	test('reports the pre-renderer when the build marks it, DOM or no DOM', () => {
		// Act
		definePrerendering(true)

		// Assert
		expect(environment.value).toBe('preRenderer')
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
})
