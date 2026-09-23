import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { applyUpdate, onUpdateReady } from '../src/_module/pwa.mts'

import { createRegistration, createWorker, install, stubServiceWorker } from './service-worker-stub.ts'

let reload: ReturnType<typeof vi.spyOn>

beforeEach(() => {
	reload = vi.spyOn(location, 'reload').mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
})

/** `onUpdateReady` looks the registration up asynchronously, so let that settle. */
function settle() {
	return new Promise(resolve => setTimeout(resolve, 0))
}

describe('onUpdateReady()', () => {
	test('fires straight away when a version is already waiting', async () => {
		// Arrange
		stubServiceWorker({ registration: createRegistration(createWorker('installed')) })
		const handler = vi.fn()

		// Act
		onUpdateReady(handler)
		await settle()

		// Assert
		expect(handler).toHaveBeenCalledTimes(1)
	})

	test('fires when a new worker finishes installing', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		const handler = vi.fn()
		onUpdateReady(handler)
		await settle()

		// Act
		install(registration, createWorker())

		// Assert
		expect(handler).toHaveBeenCalledTimes(1)
	})

	test('ignores a first install, which replaces nothing on screen', async () => {
		// Arrange
		const { registration } = stubServiceWorker({ controlled: false })
		const handler = vi.fn()
		onUpdateReady(handler)
		await settle()

		// Act
		install(registration, createWorker())

		// Assert
		expect(handler).not.toHaveBeenCalled()
	})

	test('stops listening when the signal aborts, so a component can hand it its own', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		const handler = vi.fn()
		const unmounting = new AbortController()
		onUpdateReady(unmounting.signal, handler)
		await settle()

		// Act
		unmounting.abort()
		install(registration, createWorker())

		// Assert
		expect(handler).not.toHaveBeenCalled()
	})

	test('still fires for a version already waiting when a signal is passed', async () => {
		// Arrange
		stubServiceWorker({ registration: createRegistration(createWorker('installed')) })
		const handler = vi.fn()

		// Act
		onUpdateReady(new AbortController().signal, handler)
		await settle()

		// Assert
		expect(handler).toHaveBeenCalledTimes(1)
	})

	test('does nothing where there is no service worker at all', async () => {
		// Arrange
		Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
		const handler = vi.fn()

		// Act
		onUpdateReady(handler)
		await settle()

		// Assert
		expect(handler).not.toHaveBeenCalled()
	})
})

describe('applyUpdate()', () => {
	test('hands over and reloads onto the new version', async () => {
		// Arrange
		const waiting = createWorker('installed')
		const { container } = stubServiceWorker({ registration: createRegistration(waiting) })

		// Act
		const applied = applyUpdate()
		await settle()
		container.dispatchEvent(new Event('controllerchange'))

		// Assert
		expect(await applied).toBe(true)
		expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
		expect(reload).toHaveBeenCalledTimes(1)
	})

	test('does nothing when no version is waiting', async () => {
		// Arrange
		stubServiceWorker()

		// Act
		const applied = await applyUpdate()

		// Assert
		expect(applied).toBe(false)
		expect(reload).not.toHaveBeenCalled()
	})

	test('does not reload until the new version is in control, so it cannot land back on the old one', async () => {
		// Arrange
		vi.useFakeTimers()
		stubServiceWorker({ registration: createRegistration(createWorker('installed')) })

		// Act
		void applyUpdate()
		await vi.advanceTimersByTimeAsync(60_000)

		// Assert
		expect(reload).not.toHaveBeenCalled()
		vi.useRealTimers()
	})

	test('waits for the page to finish loading before it hands over', async () => {
		// Arrange -- #364: a handover sent during the load can leave the new version stuck
		const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('interactive')
		const waiting = createWorker('installed')
		stubServiceWorker({ registration: createRegistration(waiting) })
		void applyUpdate()
		await settle()
		expect(waiting.postMessage).not.toHaveBeenCalled()

		// Act
		readyState.mockReturnValue('complete')
		window.dispatchEvent(new Event('load'))
		await settle()

		// Assert
		expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
	})
})
