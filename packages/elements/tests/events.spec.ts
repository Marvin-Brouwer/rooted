/**
 * Spec: on: {} event handlers
 *
 * Illustrates how to attach typed event listeners via the `on` prop
 * in element factory calls, and how signal-based cleanup works.
 */
import { describe, expect, test, vi } from 'vitest'

import { createElementFactory } from '../src/element-factory.mts'

describe('on: {} prop — basic usage', () => {
	test('handler fires when element dispatches the event', () => {
		const controller = new AbortController()
		const element = createElementFactory(document.createElement.bind(document), controller.signal)

		const handler = vi.fn()
		const button = element('button', { on: { click: handler } })

		button.click()
		expect(handler).toHaveBeenCalledOnce()
	})

	test('handler receives event with typed currentTarget', () => {
		const controller = new AbortController()
		const element = createElementFactory(document.createElement.bind(document), controller.signal)

		let capturedTarget: EventTarget | null = null
		const input = element('input', {
			on: {
				input(e) {
					capturedTarget = e.currentTarget
				},
			},
		})

		input.dispatchEvent(new Event('input'))
		expect(capturedTarget).toBe(input)
	})

	test('no-arg handler fires without needing the event parameter', () => {
		const controller = new AbortController()
		const element = createElementFactory(document.createElement.bind(document), controller.signal)

		const handler = vi.fn()
		const button = element('button', { on: { click: handler } })

		button.click()
		expect(handler).toHaveBeenCalledOnce()
	})

	test('multiple events on same element each fire independently', () => {
		const controller = new AbortController()
		const element = createElementFactory(document.createElement.bind(document), controller.signal)

		const onFocus = vi.fn()
		const onBlur = vi.fn()
		const input = element('input', { on: { focus: onFocus, blur: onBlur } })

		input.dispatchEvent(new Event('focus'))
		expect(onFocus).toHaveBeenCalledOnce()
		expect(onBlur).not.toHaveBeenCalled()

		input.dispatchEvent(new Event('blur'))
		expect(onBlur).toHaveBeenCalledOnce()
		expect(onFocus).toHaveBeenCalledOnce()
	})
})

describe('on: {} prop — signal / unmount cleanup', () => {
	test('listener is removed when the abort signal fires', () => {
		const controller = new AbortController()
		const element = createElementFactory(document.createElement.bind(document), controller.signal)

		const handler = vi.fn()
		const button = element('button', { on: { click: handler } })

		button.click()
		expect(handler).toHaveBeenCalledOnce()

		controller.abort()
		button.click()
		expect(handler).toHaveBeenCalledOnce() // still just once
	})

	test('no-signal factory — listener fires indefinitely', () => {
		// createElementFactory without a signal: listeners are never removed
		const element = createElementFactory(document.createElement.bind(document))

		const handler = vi.fn()
		const button = element('button', { on: { click: handler } })

		button.click()
		button.click()
		expect(handler).toHaveBeenCalledTimes(2)
	})
})

describe('on: {} prop — form events', () => {
	test('submit event on form receives HTMLFormElement as currentTarget', () => {
		const controller = new AbortController()
		const element = createElementFactory(document.createElement.bind(document), controller.signal)

		let capturedTarget: EventTarget | null = null
		const form = element('form', {
			on: {
				submit(e) {
					e.preventDefault()
					capturedTarget = e.currentTarget
				},
			},
		})

		document.body.append(form)
		form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
		expect(capturedTarget).toBe(form)
		form.remove()
	})
})
