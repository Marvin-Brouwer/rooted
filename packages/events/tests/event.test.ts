import { describe, expect, test, vi } from 'vitest'

import { createEventBuilder } from '../src/event.mts'

function makeBuilder(signal?: AbortSignal) {
	const controller = new AbortController()
	const fakeElement = {
		ownerDocument: document,
	} as unknown as Element
	return {
		on: createEventBuilder(fakeElement, signal ?? controller.signal),
		controller,
	}
}

describe('createEventBuilder — window events', () => {
	test('registers listener on globalThis.window', () => {
		const addSpy = vi.fn()
		const fakeWindow = { addEventListener: addSpy }
		vi.stubGlobal('window', fakeWindow)

		const { on } = makeBuilder()
		const handler = vi.fn()
		on('window', 'resize', handler)

		expect(addSpy).toHaveBeenCalledOnce()
		expect(addSpy.mock.calls[0][0]).toBe('resize')

		vi.unstubAllGlobals()
	})

	test('fires when event dispatched on window', () => {
		const listeners: Record<string, EventListener[]> = {}
		const fakeWindow = {
			addEventListener(type: string, function_: EventListener) {
				;(listeners[type] ??= []).push(function_)
			},
		}
		vi.stubGlobal('window', fakeWindow)

		const { on } = makeBuilder()
		const handler = vi.fn()
		on('window', 'popstate', handler)

		const event = new Event('popstate')
		if (listeners['popstate']) for (const function_ of listeners['popstate']) function_(event)
		expect(handler).toHaveBeenCalledOnce()

		vi.unstubAllGlobals()
	})

	test('no-arg handler fires without needing the event parameter', () => {
		const listeners: Record<string, EventListener[]> = {}
		const fakeWindow = {
			addEventListener(type: string, function_: EventListener) {
				;(listeners[type] ??= []).push(function_)
			},
		}
		vi.stubGlobal('window', fakeWindow)

		const { on } = makeBuilder()
		const handler = vi.fn()
		on('window', 'popstate', handler)

		if (listeners['popstate']) for (const function_ of listeners['popstate']) function_(new Event('popstate'))
		expect(handler).toHaveBeenCalledOnce()

		vi.unstubAllGlobals()
	})

	test('listener passes abort signal to addEventListener', () => {
		const addSpy = vi.fn()
		vi.stubGlobal('window', { addEventListener: addSpy })

		const controller = new AbortController()
		const fakeElement = { ownerDocument: document } as unknown as Element
		const on = createEventBuilder(fakeElement, controller.signal)
		on('window', 'resize', vi.fn())

		const options = addSpy.mock.calls[0][2] as AddEventListenerOptions | undefined
		expect(options?.signal).toBe(controller.signal)

		vi.unstubAllGlobals()
	})
})

describe('createEventBuilder — document events', () => {
	test('registers listener on ownerDocument', () => {
		const addSpy = vi.spyOn(document, 'addEventListener')

		const { on } = makeBuilder()
		const handler = vi.fn()
		on('document', 'click', handler)

		expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.objectContaining({ signal: expect.any(AbortSignal) as AbortSignal }))
		addSpy.mockRestore()
	})

	test('fires when event dispatched on document', () => {
		const { on } = makeBuilder()
		const handler = vi.fn()
		on('document', 'click', handler)

		document.dispatchEvent(new Event('click'))
		expect(handler).toHaveBeenCalledOnce()
	})

	test('no-arg handler fires without needing the event parameter', () => {
		const { on } = makeBuilder()
		const handler = vi.fn()
		on('document', 'click', handler)

		document.dispatchEvent(new Event('click'))
		expect(handler).toHaveBeenCalledOnce()
	})

	test('listener is removed when abort signal fires', () => {
		const controller = new AbortController()
		const fakeElement = { ownerDocument: document } as unknown as Element
		const on = createEventBuilder(fakeElement, controller.signal)
		const handler = vi.fn()
		on('document', 'click', handler)

		document.dispatchEvent(new Event('click'))
		expect(handler).toHaveBeenCalledOnce()

		controller.abort()
		document.dispatchEvent(new Event('click'))
		expect(handler).toHaveBeenCalledOnce() // still just once
	})
})
