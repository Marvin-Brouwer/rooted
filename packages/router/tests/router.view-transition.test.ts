import { describe, test, expect, vi, afterEach } from 'vitest'

import { renderWithViewTransition } from '../src/router.view-transition.mts'

type TestDocument = Document & {
	startViewTransition?: (callback: () => void) => { ready: Promise<void> }
}

const testDocument = document as TestDocument

function stubViewTransition(ready: Promise<void>) {
	testDocument.startViewTransition = (callback) => {
		callback()
		return { ready }
	}
}

// Waits long enough for node to report a rejection nobody handled.
function nextMacrotask() {
	return new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => {
	delete testDocument.startViewTransition
})

describe('renderWithViewTransition()', () => {
	test('renders directly when the browser has no view transitions', () => {
		// Arrange
		const render = vi.fn()

		// Act
		renderWithViewTransition(render)

		// Assert
		expect(render).toHaveBeenCalledOnce()
	})

	test('renders through the transition when the browser supports it', () => {
		// Arrange
		const render = vi.fn()
		stubViewTransition(Promise.resolve())

		// Act
		renderWithViewTransition(render)

		// Assert
		expect(render).toHaveBeenCalledOnce()
	})

	test('handles the rejection of a transition skipped by the next navigation', async () => {
		// Arrange
		const unhandled: unknown[] = []
		const collect = (error: unknown) => unhandled.push(error)
		process.on('unhandledRejection', collect)
		stubViewTransition(Promise.reject(new DOMException('Transition was skipped', 'AbortError')))

		// Act
		renderWithViewTransition(vi.fn())

		// Assert
		await nextMacrotask()
		process.off('unhandledRejection', collect)
		expect(unhandled).toEqual([])
	})
})
