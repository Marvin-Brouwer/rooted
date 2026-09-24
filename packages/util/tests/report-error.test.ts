import { afterEach, describe, test, expect, vi } from 'vitest'

import { reportError } from '../src/report-error.mts'

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('reportError', () => {
	test('uses the native reportError when there is one', () => {
		// Arrange
		const native = vi.fn()
		vi.stubGlobal('reportError', native)
		const error = new Error('boom')

		// Act
		reportError(error)

		// Assert
		expect(native).toHaveBeenCalledExactlyOnceWith(error)
	})

	test('without a native reportError, throws the error from a microtask', () => {
		// Arrange
		vi.stubGlobal('reportError', undefined)
		const queueMicrotask = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => {})
		const error = new Error('boom')

		// Act
		reportError(error)

		// Assert
		const task = queueMicrotask.mock.calls[0]?.[0]
		expect(task).toThrow(error)
	})
})
