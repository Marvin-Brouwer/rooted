import { describe, expect, test, vi } from 'vitest'

import { createStore } from '../src/store.mts'

// Dispatching 'pagehide' aborts `storeAbortSignal` for good, so this test
// lives in its own file. Vitest isolates per file, which keeps it out of the
// other store tests.
describe('createStore — subscribing without a signal, on page unload', () => {
	test('listener is removed when the page is permanently unloaded', () => {
		// Arrange
		const store = createStore({ count: 0 })
		const handler = vi.fn()
		store.on('change', handler)
		store.update((s) => {
			s.count = 1
		})
		expect(handler).toHaveBeenCalledTimes(1)

		// Act
		globalThis.window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))
		store.update((s) => {
			s.count = 2
		})

		// Assert
		expect(handler).toHaveBeenCalledTimes(1)
	})
})
