// @vitest-environment node
// Runs in plain Node on purpose: this module exists to make route files
// evaluatable where there is no DOM, so a happy-dom environment would make
// every assertion here pass vacuously.
import { Window } from 'happy-dom'
import { describe, test, expect } from 'vitest'

import { environment } from '@rooted/util'

import { withDomGlobals } from '../src/_module/dom-globals.mts'

describe('withDomGlobals()', () => {
	test('the test environment really has no DOM', () => {
		// Assert
		expect(typeof window).toBe('undefined')
		expect(typeof document).toBe('undefined')
		expect(typeof HTMLElement).toBe('undefined')
		expect(typeof ErrorEvent).toBe('undefined')
	})

	test('installs a DOM for the duration of the callback', async () => {
		// Act
		const seen = await withDomGlobals(() => Promise.resolve({
			window: typeof window,
			document: typeof document,
			htmlElement: typeof HTMLElement,
			errorEvent: typeof ErrorEvent,
			cssStyleSheet: typeof CSSStyleSheet,
			customElements: typeof customElements,
			href: location.href,
		}))

		// Assert
		expect(seen).toEqual({
			window: 'object',
			document: 'object',
			htmlElement: 'function',
			errorEvent: 'function',
			cssStyleSheet: 'function',
			customElements: 'object',
			href: 'http://localhost/',
		})
	})

	test('removes globals that did not exist before', async () => {
		// Act
		await withDomGlobals(() => Promise.resolve())

		// Assert
		expect(typeof window).toBe('undefined')
		expect(typeof document).toBe('undefined')
		expect(typeof HTMLElement).toBe('undefined')
		expect(typeof ErrorEvent).toBe('undefined')
		expect('location' in globalThis).toBe(false)
	})

	test('restores navigator as the accessor Node defines, not a plain value', async () => {
		// Arrange
		const before = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

		// Act
		await withDomGlobals(() => Promise.resolve())

		// Assert
		const after = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
		expect(after?.get).toBe(before?.get)
		expect(after?.value).toBe(before?.value)
	})

	test('leaves location assignable and deletable afterwards', async () => {
		// Act
		await withDomGlobals(() => Promise.resolve())

		// Assert: resolveRouteSeo and vite-plugin-pwa both do exactly this
		const globals = globalThis as unknown as Record<string, unknown>
		expect(() => { globals['location'] = { href: 'http://example.com/' } }).not.toThrow()
		expect(() => Reflect.deleteProperty(globalThis, 'location')).not.toThrow()
		expect('location' in globalThis).toBe(false)
	})

	test('reads as the pre-render environment for the duration of the callback', async () => {
		// Arrange
		expect(environment.value).toBe('server')

		// Act
		const seen = await withDomGlobals(() => Promise.resolve(environment.value))

		// Assert: route files run against happy-dom, same as the pre-render, so they get the same answer
		expect(seen).toBe('preRenderer')
		expect(environment.value).toBe('server')
	})

	test('restores the environment when the callback throws', async () => {
		// Act
		const failing = withDomGlobals(() => Promise.reject(new Error('boom')))

		// Assert
		await expect(failing).rejects.toThrow('boom')
		expect(typeof window).toBe('undefined')
		expect(typeof document).toBe('undefined')
	})

	test('serializes overlapping calls without leaking a DOM', async () => {
		// Act
		const results = await Promise.all([
			withDomGlobals(() => Promise.resolve(typeof window)),
			withDomGlobals(() => Promise.resolve(typeof window)),
			withDomGlobals(() => Promise.resolve(typeof window)),
		])

		// Assert
		expect(results).toEqual(['object', 'object', 'object'])
		expect(typeof window).toBe('undefined')
	})

	test('a failed call does not poison later calls', async () => {
		// Arrange
		await expect(withDomGlobals(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')

		// Act
		const seen = await withDomGlobals(() => Promise.resolve(typeof document))

		// Assert
		expect(seen).toBe('object')
		expect(typeof window).toBe('undefined')
	})
})

describe('withDomGlobals() with options', () => {
	test('leaves Node\'s fetch alone by default', async () => {
		// Arrange
		const nodeFetch = globalThis.fetch

		// Act
		const seen = await withDomGlobals(() => Promise.resolve(globalThis.fetch))

		// Assert
		expect(seen).toBe(nodeFetch)
	})

	test('installs the window\'s fetch when asked', async () => {
		// Arrange
		const windowFetch = () => Promise.reject(new Error('offline'))
		const window = Object.assign(new Window({ url: 'http://localhost/' }), { fetch: windowFetch })

		// Act
		const seen = await withDomGlobals(() => Promise.resolve(globalThis.fetch), { window, fetch: true })

		// Assert
		expect(seen).toBe(windowFetch)
	})

	test('puts Node\'s fetch back after installing the window\'s', async () => {
		// Arrange
		const nodeFetch = globalThis.fetch
		const window = new Window({ url: 'http://localhost/' })

		// Act
		await withDomGlobals(() => Promise.resolve(), { window, fetch: true })

		// Assert
		expect(globalThis.fetch).toBe(nodeFetch)
	})

	test('skips keys a catch-all proxy window does not really have', async () => {
		// Arrange
		const document = {}
		const window = new Proxy({ document }, {
			get: (target, property) => (Reflect.get(target, property) as unknown) ?? (() => {}),
		})

		// Act
		const seen = await withDomGlobals(
			() => Promise.resolve({ document: globalThis.document, element: 'HTMLElement' in globalThis }),
			{ window },
		)

		// Assert
		expect(seen).toEqual({ document, element: false })
	})

	test('leaves a window it was given open', async () => {
		// Arrange
		const window = new Window({ url: 'http://localhost/' })
		let closed = false
		window.happyDOM.close = () => {
			closed = true
			return Promise.resolve()
		}

		// Act
		await withDomGlobals(() => Promise.resolve(), { window })

		// Assert
		expect(closed).toBe(false)
	})

	test('takes a half-done install back off when it throws', async () => {
		// Arrange
		const window = new Proxy({ document: {} }, {
			get: (target, property) => {
				if (property === 'document') throw new Error('boom')
				return Reflect.get(target, property) as unknown
			},
		})

		// Act
		const failing = withDomGlobals(() => Promise.resolve(), { window })

		// Assert
		await expect(failing).rejects.toThrow('boom')
		expect(typeof globalThis.window).toBe('undefined')
	})
})
