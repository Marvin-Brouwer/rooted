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

	test('stops listening once the returned function is called', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		const handler = vi.fn()
		const stop = onUpdateReady(handler)
		await settle()

		// Act
		stop()
		install(registration, createWorker())

		// Assert
		expect(handler).not.toHaveBeenCalled()
	})

	test('stops listening when the signal aborts, so a component can hand it its own', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		const handler = vi.fn()
		const unmounting = new AbortController()
		onUpdateReady(handler, { signal: unmounting.signal })
		await settle()

		// Act
		unmounting.abort()
		install(registration, createWorker())

		// Assert
		expect(handler).not.toHaveBeenCalled()
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

	test('reloads anyway when the new worker never takes control, rather than hanging', async () => {
		// Arrange
		vi.useFakeTimers()
		stubServiceWorker({ registration: createRegistration(createWorker('installed')) })

		// Act
		const applied = applyUpdate()
		await vi.advanceTimersByTimeAsync(5000)

		// Assert
		expect(await applied).toBe(true)
		expect(reload).toHaveBeenCalledTimes(1)
		vi.useRealTimers()
	})
})
