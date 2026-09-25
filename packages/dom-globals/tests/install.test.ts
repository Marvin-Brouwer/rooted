// @vitest-environment node
// Runs in plain Node on purpose: restoring only means anything where there was no DOM to begin with.
import { Window } from 'happy-dom'
import { describe, test, expect } from 'vitest'

import { installDomGlobals } from '../src/_module/dom-globals.mts'

describe('installDomGlobals()', () => {
	test('leaves Node\'s fetch alone by default', () => {
		// Arrange
		const nodeFetch = globalThis.fetch
		const window = new Window({ url: 'http://localhost/' })

		// Act
		const restore = installDomGlobals(window)
		const seen = globalThis.fetch
		restore()

		// Assert
		expect(seen).toBe(nodeFetch)
	})

	test('installs the window\'s fetch when asked', () => {
		// Arrange
		const windowFetch = () => Promise.reject(new Error('offline'))
		const window = Object.assign(new Window({ url: 'http://localhost/' }), { fetch: windowFetch })

		// Act
		const restore = installDomGlobals(window, { fetch: true })
		const seen = globalThis.fetch
		restore()

		// Assert
		expect(seen).toBe(windowFetch)
	})

	test('puts Node\'s fetch back after installing the window\'s', () => {
		// Arrange
		const nodeFetch = globalThis.fetch
		const restore = installDomGlobals(new Window({ url: 'http://localhost/' }), { fetch: true })

		// Act
		restore()

		// Assert
		expect(globalThis.fetch).toBe(nodeFetch)
	})

	test('skips keys a catch-all proxy window does not really have', () => {
		// Arrange
		const document = {}
		const window = new Proxy({ document }, {
			get: (target, property) => (Reflect.get(target, property) as unknown) ?? (() => {}),
		})

		// Act
		const restore = installDomGlobals(window)
		const seen = { document: globalThis.document, element: 'HTMLElement' in globalThis }
		restore()

		// Assert
		expect(seen).toEqual({ document, element: false })
	})

	test('restores navigator as the accessor Node defines, not a plain value', () => {
		// Arrange
		const before = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
		const restore = installDomGlobals(new Window({ url: 'http://localhost/' }))

		// Act
		restore()

		// Assert
		const after = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
		expect(after?.get).toBe(before?.get)
		expect(after?.value).toBe(before?.value)
	})

	test('takes a half-done install back off when it throws', () => {
		// Arrange
		const window = new Proxy({ document: {} }, {
			get: (target, property) => {
				if (property === 'document') throw new Error('boom')
				return Reflect.get(target, property) as unknown
			},
		})

		// Act
		const install = () => installDomGlobals(window)

		// Assert
		expect(install).toThrow('boom')
		expect(typeof globalThis.window).toBe('undefined')
	})
})
