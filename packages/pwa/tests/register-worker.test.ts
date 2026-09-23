import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { registerWorker } from '../src/_module/pwa.mts'

import { createRegistration, createWorker, install, stubServiceWorker } from './service-worker-stub.ts'

const oneHour = 60 * 60 * 1000

/** Every registration in here is torn down after its test, so they can't overlap. */
let page: AbortController

beforeEach(() => {
	page = new AbortController()
	vi.useFakeTimers()
	vi.spyOn(location, 'reload').mockImplementation(() => {})
})

afterEach(() => {
	page.abort()
	vi.useRealTimers()
	vi.restoreAllMocks()
})

function register(options: Parameters<typeof registerWorker>[0] = {}) {
	return registerWorker({ ...options, signal: page.signal })
}

/** happy-dom starts hidden, and the visible check is what we're after. */
function becomeVisible() {
	vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
	document.dispatchEvent(new Event('visibilitychange'))
}

describe('registerWorker()', () => {
	test('registers the worker next to the script that called it', async () => {
		// Arrange
		const { container } = stubServiceWorker()

		// Act
		await register()

		// Assert
		const [url] = container.register.mock.calls[0] as [URL]
		expect(url.pathname.endsWith('/worker.js')).toBe(true)
	})

	test('re-checks on an interval, so a long-running app does not sit on a stale version', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		await register()

		// Act
		await vi.advanceTimersByTimeAsync(oneHour * 2)

		// Assert -- #331: without this an installed PWA only ever checked at launch
		expect(registration.update).toHaveBeenCalledTimes(2)
	})

	test('re-checks when the tab becomes visible again', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		await register({ checkInterval: false })

		// Act
		becomeVisible()

		// Assert
		expect(registration.update).toHaveBeenCalledTimes(1)
	})

	test('re-checks when the network comes back', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		await register({ checkInterval: false })

		// Act
		window.dispatchEvent(new Event('online'))

		// Assert
		expect(registration.update).toHaveBeenCalledTimes(1)
	})

	test('leaves polling off when checkInterval is false', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		await register({ checkInterval: false })

		// Act
		await vi.advanceTimersByTimeAsync(oneHour * 5)

		// Assert
		expect(registration.update).not.toHaveBeenCalled()
	})

	test('never hands a waiting version over on its own, the browser does that once the app is closed', async () => {
		// Arrange
		const waiting = createWorker('installed')
		stubServiceWorker({ registration: createRegistration(waiting) })

		// Act
		await register()

		// Assert -- #364: a handover sent while the page loads can get the new version stuck
		expect(waiting.postMessage).not.toHaveBeenCalled()
		expect(location.reload).not.toHaveBeenCalled()
	})

	test('leaves a version that turns up mid-session alone, which is the whole point of #331', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		await register()

		// Act -- a new worker finishes installing while the page is running
		const waiting = createWorker('installed')
		registration.waiting = waiting
		install(registration, waiting)

		// Assert
		expect(waiting.postMessage).not.toHaveBeenCalled()
		expect(location.reload).not.toHaveBeenCalled()
	})

	test('reloads when another tab hands over, so this one does not route against a precache that is gone', async () => {
		// Arrange
		const { container } = stubServiceWorker()
		await register()

		// Act
		container.dispatchEvent(new Event('controllerchange'))

		// Assert
		expect(location.reload).toHaveBeenCalledTimes(1)
	})

	test('does not reload when a worker claims a page that nothing controlled yet', async () => {
		// Arrange
		const { container } = stubServiceWorker({ controlled: false })
		await register()

		// Act -- a first visit, loaded from the network, so it already is the build that worker serves
		container.dispatchEvent(new Event('controllerchange'))

		// Assert
		expect(location.reload).not.toHaveBeenCalled()
	})

	test('does nothing where there is no service worker at all', async () => {
		// Arrange
		Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })

		// Act
		const registration = await register()

		// Assert
		expect(registration).toBeUndefined()
	})
})
