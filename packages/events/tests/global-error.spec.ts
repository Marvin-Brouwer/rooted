/**
 * Spec: global 'unhandled-error' — usage via createEventBuilder
 *
 * Illustrates how a component registers a single handler for all unhandled
 * errors in the application — whether they originate from synchronous code
 * (window `error`) or from unhandled promise rejections (`unhandledrejection`).
 *
 * Both paths are normalized to `UnhandledErrorEvent` and filtered to
 * application-origin errors before the handler is called. Extension errors,
 * cross-origin script errors, and unverifiable rejections are silently dropped.
 */
import { afterEach, describe, expect, test, vi } from 'vitest'

import { createEventBuilder } from '../src/event.mts'
import { UnhandledErrorEvent } from '../src/global-events.mts'

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

function makeBuilder(signal?: AbortSignal) {
	const controller = new AbortController()
	const fakeElement = { ownerDocument: document } as unknown as Element
	return {
		on: createEventBuilder(fakeElement, signal ?? controller.signal),
		controller,
	}
}

function makeFakeWindow() {
	const listeners: Record<string, EventListener[]> = {}
	return {
		window: {
			addEventListener(type: string, function_: EventListener, options?: AddEventListenerOptions) {
				options?.signal?.addEventListener('abort', () => {
					const index = listeners[type]?.indexOf(function_) ?? -1
					if (index !== -1) listeners[type]?.splice(index, 1)
				})
				; (listeners[type] ??= []).push(function_)
			},
		},
		dispatch(type: string, event: Event) {
			for (const function_ of listeners[type]?.slice()) function_(event)
		},
	}
}

/**
 * Stand-in for `PromiseRejectionEvent` (not available in happy-dom).
 * Extends `Event` so `instanceof ErrorEvent` is `false`, matching browser behavior.
 */
class FakeRejectionEvent extends Event {
	readonly reason: unknown
	readonly promise: Promise<unknown>
	constructor(reason: unknown, promise: Promise<unknown> = Promise.resolve()) {
		super('unhandledrejection', { bubbles: false, cancelable: false })
		this.reason = reason
		this.promise = promise
	}
}

afterEach(() => vi.unstubAllGlobals())

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('on("global", "unhandled-error") — single handler for all app errors', () => {
	test('registers on both window error and unhandledrejection', () => {
		const addSpy = vi.fn()
		vi.stubGlobal('window', { addEventListener: addSpy })

		const { on } = makeBuilder()
		on('global', 'unhandled-error', vi.fn())

		expect(addSpy.mock.calls.map(([type]) => type)).toContain('error')
		expect(addSpy.mock.calls.map(([type]) => type)).toContain('unhandledrejection')
	})

	test('synchronous errors arrive as UnhandledErrorEvent', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		const { window, dispatch } = makeFakeWindow()
		vi.stubGlobal('window', window)

		const { on } = makeBuilder()
		const handler = vi.fn()
		on('global', 'unhandled-error', handler)

		const error = new Error('something broke')
		dispatch('error', new ErrorEvent('error', {
			error,
			message: error.message,
			filename: 'https://app.test/src/main.js',
			lineno: 10,
			colno: 3,
		}))

		const received = handler.mock.calls[0][0] as UnhandledErrorEvent
		expect(received).toBeInstanceOf(UnhandledErrorEvent)
		expect(received.type).toBe('unhandled-error')
		// The original ErrorEvent is accessible when needed
		expect(received.innerEvent).toBeInstanceOf(ErrorEvent)
		// No promise — this came from synchronous code
		expect(received.promise).toBeUndefined()
	})

	test('unhandled rejections arrive as UnhandledErrorEvent with the original promise', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		const { window, dispatch } = makeFakeWindow()
		vi.stubGlobal('window', window)

		const { on } = makeBuilder()
		const handler = vi.fn()
		on('global', 'unhandled-error', handler)

		const error = new Error('fetch failed')
		error.stack = `Error: fetch failed\n    at loadUser (https://app.test/src/api.js:42:5)`
		const promise = Promise.resolve()
		dispatch('unhandledrejection', new FakeRejectionEvent(error, promise))

		const received = handler.mock.calls[0][0] as UnhandledErrorEvent
		expect(received).toBeInstanceOf(UnhandledErrorEvent)
		expect(received.type).toBe('unhandled-error')
		// Location info is extracted from the stack trace
		expect(received.filename).toBe('https://app.test/src/api.js')
		expect(received.lineno).toBe(42)
		// The promise is available for diagnostics or reporting
		expect(received.promise).toBe(promise)
	})

	test('non-app errors are silently dropped — extension and cross-origin scripts', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		const { window, dispatch } = makeFakeWindow()
		vi.stubGlobal('window', window)

		const { on } = makeBuilder()
		const handler = vi.fn()
		on('global', 'unhandled-error', handler)

		// Cross-origin script error — browser deliberately hides details
		dispatch('error', new ErrorEvent('error', {
			error: new Error('x'),
			message: 'Script error.',
			filename: '',
			lineno: 0,
			colno: 0,
		}))

		// Rejection from a browser extension
		const extensionError = new Error('injected')
		extensionError.stack = `Error: injected\n    at (chrome-extension://abc/content.js:1:1)`
		dispatch('unhandledrejection', new FakeRejectionEvent(extensionError))

		expect(handler).not.toHaveBeenCalled()
	})

	test('handler stops receiving events when the component is unmounted (abort signal)', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		const { window, dispatch } = makeFakeWindow()
		vi.stubGlobal('window', window)

		const controller = new AbortController()
		const fakeElement = { ownerDocument: document } as unknown as Element
		const on = createEventBuilder(fakeElement, controller.signal)
		const handler = vi.fn()
		on('global', 'unhandled-error', handler)

		const errorEvent = new ErrorEvent('error', {
			error: new Error('boom'),
			message: 'boom',
			filename: 'https://app.test/src/main.js',
			lineno: 1,
			colno: 1,
		})

		dispatch('error', errorEvent)
		expect(handler).toHaveBeenCalledOnce()

		// Simulating component unmount — listener is automatically removed
		controller.abort()
		dispatch('error', errorEvent)
		expect(handler).toHaveBeenCalledOnce() // still just once
	})
})
