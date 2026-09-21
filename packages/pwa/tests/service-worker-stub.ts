import { vi } from 'vitest'

/** The bits of `ServiceWorker` these tests drive. */
export type WorkerStub = EventTarget & {
	state: ServiceWorkerState
	postMessage: ReturnType<typeof vi.fn>
}

/** The bits of `ServiceWorkerRegistration` these tests drive. */
export type RegistrationStub = EventTarget & {
	waiting: WorkerStub | null
	installing: WorkerStub | null
	update: ReturnType<typeof vi.fn>
}

export function createWorker(state: ServiceWorkerState = 'installing'): WorkerStub {
	return Object.assign(new EventTarget(), { state, postMessage: vi.fn() })
}

export function createRegistration(waiting: WorkerStub | null = null): RegistrationStub {
	return Object.assign(new EventTarget(), {
		waiting,
		installing: null,
		update: vi.fn().mockResolvedValue(undefined),
	})
}

/**
 * Installs a fake `navigator.serviceWorker`.
 * happy-dom has none, and the real one needs a served origin, so every test here drives this instead.
 */
export function stubServiceWorker(options: { registration?: RegistrationStub, controlled?: boolean } = {}) {
	const { registration = createRegistration(), controlled = true } = options

	const container = Object.assign(new EventTarget(), {
		controller: controlled ? createWorker('activated') : null,
		register: vi.fn().mockResolvedValue(registration),
		getRegistration: vi.fn().mockResolvedValue(registration),
		ready: Promise.resolve(registration),
	})

	Object.defineProperty(navigator, 'serviceWorker', {
		value: container,
		configurable: true,
		writable: true,
	})

	return { container, registration }
}

/** Moves a worker through `installing` to `installed`, the way the browser does. */
export function install(registration: RegistrationStub, worker: WorkerStub) {
	registration.installing = worker
	registration.dispatchEvent(new Event('updatefound'))

	worker.state = 'installed'
	worker.dispatchEvent(new Event('statechange'))
}
