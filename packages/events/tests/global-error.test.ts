import { afterEach, describe, expect, test, vi } from 'vitest'

import { UnhandledErrorEvent, isApplicationErrorError } from '../src/global-events.mts'

/**
 * Minimal stand-in for `PromiseRejectionEvent`, which happy-dom does not implement.
 * Extends `Event` so `instanceof ErrorEvent` is `false` — matching real browser behaviour.
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

function fakeRejection(reason: unknown, promise = Promise.resolve()) {
	return new FakeRejectionEvent(reason, promise)
}

afterEach(() => vi.unstubAllGlobals())

// ---------------------------------------------------------------------------
// isApplicationErrorError
// ---------------------------------------------------------------------------

describe('isApplicationErrorError — ErrorEvent', () => {
	test('returns false when error object is absent', () => {
		expect(isApplicationErrorError(new ErrorEvent('error', {
			message: 'Something went wrong',
			filename: 'https://app.test/main.js',
			lineno: 1,
			colno: 1,
		}))).toBe(false)
	})

	test('returns false for "Script error." — cross-origin browser sentinel', () => {
		expect(isApplicationErrorError(new ErrorEvent('error', {
			error: new Error('x'),
			message: 'Script error.',
			filename: 'https://app.test/main.js',
			lineno: 1,
			colno: 1,
		}))).toBe(false)
	})

	test('returns false when lineno and colno are both 0 — cross-origin signal', () => {
		expect(isApplicationErrorError(new ErrorEvent('error', {
			error: new Error('x'),
			message: 'Something failed',
			filename: 'https://app.test/main.js',
			lineno: 0,
			colno: 0,
		}))).toBe(false)
	})

	test('returns false for errors from browser extension scripts', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		expect(isApplicationErrorError(new ErrorEvent('error', {
			error: new Error('injected'),
			message: 'injected',
			filename: 'chrome-extension://abc123/content.js',
			lineno: 5,
			colno: 3,
		}))).toBe(false)
	})

	test('returns false for errors from a different origin', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		expect(isApplicationErrorError(new ErrorEvent('error', {
			error: new Error('cdn error'),
			message: 'cdn error',
			filename: 'https://cdn.other.com/lib.js',
			lineno: 1,
			colno: 1,
		}))).toBe(false)
	})

	test('returns true for same-origin error', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		const error = new Error('boom')
		expect(isApplicationErrorError(new ErrorEvent('error', {
			error,
			message: error.message,
			filename: 'https://app.test/src/main.js',
			lineno: 42,
			colno: 7,
		}))).toBe(true)
	})
})

describe('isApplicationErrorError — PromiseRejectionEvent', () => {
	test('returns true when rejection reason stack points to app origin', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		const error = new Error('async boom')
		error.stack = `Error: async boom\n    at doWork (https://app.test/src/worker.js:22:5)`
		expect(isApplicationErrorError(fakeRejection(error))).toBe(true)
	})

	test('returns false when rejection reason stack points to an extension', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		const error = new Error('ext error')
		error.stack = `Error: ext error\n    at inject (chrome-extension://xyz/inject.js:1:1)`
		expect(isApplicationErrorError(fakeRejection(error))).toBe(false)
	})

	test('returns false when rejection reason stack points to a different origin', () => {
		vi.stubGlobal('location', { origin: 'https://app.test' })
		const error = new Error('third-party')
		error.stack = `Error: third-party\n    at fn (https://cdn.other.com/lib.js:10:2)`
		expect(isApplicationErrorError(fakeRejection(error))).toBe(false)
	})

	test('returns false when reason has no stack (cannot verify origin)', () => {
		expect(isApplicationErrorError(fakeRejection('a plain string rejection'))).toBe(false)
	})

	test('returns false when reason is absent', () => {
		expect(isApplicationErrorError(fakeRejection(undefined))).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// UnhandledErrorEvent.forError
// ---------------------------------------------------------------------------

describe('UnhandledErrorEvent.forError', () => {
	test('produces an UnhandledErrorEvent', () => {
		const event = UnhandledErrorEvent.forError(new ErrorEvent('error', {
			error: new Error('x'), lineno: 1, colno: 1, filename: 'x',
		}))
		expect(event).toBeInstanceOf(UnhandledErrorEvent)
		expect(event).toBeInstanceOf(ErrorEvent)
	})

	test('type is "unhandled-error"', () => {
		const event = UnhandledErrorEvent.forError(new ErrorEvent('error', {
			error: new Error('x'), lineno: 1, colno: 1, filename: 'x',
		}))
		expect(event.type).toBe('unhandled-error')
	})

	test('stores the original ErrorEvent as innerEvent', () => {
		const source = new ErrorEvent('error', { error: new Error('x'), lineno: 1, colno: 1, filename: 'x' })
		expect(UnhandledErrorEvent.forError(source).innerEvent).toBe(source)
	})

	test('promise is undefined — error events have no associated promise', () => {
		const event = UnhandledErrorEvent.forError(new ErrorEvent('error', {
			error: new Error('x'), lineno: 1, colno: 1, filename: 'x',
		}))
		expect(event.promise).toBeUndefined()
	})

	test('copies filename / lineno / colno / message / error from the source', () => {
		const error = new Error('oops')
		const event = UnhandledErrorEvent.forError(new ErrorEvent('error', {
			error,
			message: 'oops',
			filename: 'https://app.test/src/main.js',
			lineno: 42,
			colno: 7,
		}))
		expect(event.error).toBe(error)
		expect(event.message).toBe('oops')
		expect(event.filename).toBe('https://app.test/src/main.js')
		expect(event.lineno).toBe(42)
		expect(event.colno).toBe(7)
	})
})

// ---------------------------------------------------------------------------
// UnhandledErrorEvent.forRejection
// ---------------------------------------------------------------------------

describe('UnhandledErrorEvent.forRejection', () => {
	test('produces an UnhandledErrorEvent', () => {
		const event = UnhandledErrorEvent.forRejection(fakeRejection(new Error('async boom')))
		expect(event).toBeInstanceOf(UnhandledErrorEvent)
		expect(event).toBeInstanceOf(ErrorEvent)
	})

	test('type is "unhandled-error"', () => {
		expect(UnhandledErrorEvent.forRejection(fakeRejection(new Error('x'))).type).toBe('unhandled-error')
	})

	test('stores the original rejection event as innerEvent', () => {
		const rejection = fakeRejection(new Error('x'))
		expect(UnhandledErrorEvent.forRejection(rejection).innerEvent).toBe(rejection)
	})

	test('exposes the original promise', () => {
		const promise = Promise.resolve()
		expect(UnhandledErrorEvent.forRejection(fakeRejection(new Error('x'), promise)).promise).toBe(promise)
	})

	test('extracts filename / lineno / colno / message from the reason stack', () => {
		const error = new Error('async fail')
		error.stack = `Error: async fail\n    at processQueue (https://app.test/src/queue.js:55:12)`
		const event = UnhandledErrorEvent.forRejection(fakeRejection(error))
		expect(event.filename).toBe('https://app.test/src/queue.js')
		expect(event.lineno).toBe(55)
		expect(event.colno).toBe(12)
		expect(event.message).toBe('async fail')
	})
})
