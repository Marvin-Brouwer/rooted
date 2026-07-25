// @vitest-environment node
// Runs in plain Node on purpose: this module exists to make route files
// evaluatable where there is no DOM, so a happy-dom environment would make
// every assertion here pass vacuously.
import { describe, test, expect } from 'vitest'

import { withDomGlobals } from '../plugins/dom-globals.mts'

describe('withDomGlobals()', () => {
	test('the test environment really has no DOM', () => {
		expect(typeof window).toBe('undefined')
		expect(typeof document).toBe('undefined')
		expect(typeof HTMLElement).toBe('undefined')
		expect(typeof ErrorEvent).toBe('undefined')
	})

	test('installs a DOM for the duration of the callback', async () => {
		const seen = await withDomGlobals(() => Promise.resolve({
			window: typeof window,
			document: typeof document,
			htmlElement: typeof HTMLElement,
			errorEvent: typeof ErrorEvent,
			cssStyleSheet: typeof CSSStyleSheet,
			customElements: typeof customElements,
			href: location.href,
		}))

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
		await withDomGlobals(() => Promise.resolve())

		expect(typeof window).toBe('undefined')
		expect(typeof document).toBe('undefined')
		expect(typeof HTMLElement).toBe('undefined')
		expect(typeof ErrorEvent).toBe('undefined')
		expect('location' in globalThis).toBe(false)
	})

	test('restores navigator as the accessor Node defines, not a plain value', async () => {
		const before = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
		await withDomGlobals(() => Promise.resolve())
		const after = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

		expect(after?.get).toBe(before?.get)
		expect(after?.value).toBe(before?.value)
	})

	test('leaves location assignable and deletable afterwards', async () => {
		await withDomGlobals(() => Promise.resolve())

		// resolveRouteSeo and vite-plugin-pwa both do exactly this
		const globals = globalThis as unknown as Record<string, unknown>
		expect(() => { globals['location'] = { href: 'http://example.com/' } }).not.toThrow()
		expect(() => Reflect.deleteProperty(globalThis, 'location')).not.toThrow()
		expect('location' in globalThis).toBe(false)
	})

	test('restores the environment when the callback throws', async () => {
		await expect(withDomGlobals(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')

		expect(typeof window).toBe('undefined')
		expect(typeof document).toBe('undefined')
	})

	test('serializes overlapping calls without leaking a DOM', async () => {
		const results = await Promise.all([
			withDomGlobals(() => Promise.resolve(typeof window)),
			withDomGlobals(() => Promise.resolve(typeof window)),
			withDomGlobals(() => Promise.resolve(typeof window)),
		])

		expect(results).toEqual(['object', 'object', 'object'])
		expect(typeof window).toBe('undefined')
	})

	test('a failed call does not poison later calls', async () => {
		await expect(withDomGlobals(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
		expect(await withDomGlobals(() => Promise.resolve(typeof document))).toBe('object')
		expect(typeof window).toBe('undefined')
	})

	test('the router root barrel can be imported inside it', async () => {
		// The exact import that crashes route-manifest generation without a DOM:
		// it reaches @rooted/components -> @rooted/elements -> @rooted/events,
		// where a class extends ErrorEvent at module scope.
		const routerModule = await withDomGlobals(() => import('../src/_module/router.mts'))

		expect(routerModule.href).toBeDefined()
		expect(routerModule.Link).toBeDefined()
		expect(typeof window).toBe('undefined')
	})
})
