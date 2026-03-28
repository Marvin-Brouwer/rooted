/**
 * Spec: event forwarding pattern with EventHandler<'button', 'click'>
 *
 * Illustrates how a component accepts typed event callbacks from its
 * parent via `EventHandler<tag, event>` in the options type, then wires
 * them to inner elements using the `on: {}` prop.
 */
import { describe, expect, test, vi } from 'vitest'

import { createElementFactory } from '../../elements/src/element-factory.mts'
import { EventHandler, TargetedEvent } from '../../events/src/event.mts'

// ---------------------------------------------------------------------------
// Example component shape — a simple Button that forwards click to the parent
// ---------------------------------------------------------------------------

type ButtonOptions = {
	on?: {
		click?: EventHandler<'button', 'click'>
	}
}

function createButton(options: ButtonOptions, signal: AbortSignal) {
	const element = createElementFactory(document.createElement.bind(document), signal)
	return element('button', {
		on: {
			click: options.on?.click,
		},
	})
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventHandler<tag, event> — forwarding pattern', () => {
	test('parent callback fires when child button is clicked', () => {
		const controller = new AbortController()
		const onClick = vi.fn()

		const button = createButton({ on: { click: onClick } }, controller.signal)
		button.click()

		expect(onClick).toHaveBeenCalledOnce()
	})

	test('forwarded click receives TargetedEvent with correct currentTarget', () => {
		const controller = new AbortController()
		let capturedTarget: EventTarget | null = null

		const button = createButton(
			{
				on: {
					click(e: TargetedEvent<MouseEvent, HTMLButtonElement>) {
						capturedTarget = e.currentTarget
					},
				},
			},
			controller.signal,
		)

		button.click()
		expect(capturedTarget).toBe(button)
	})

	test('no-arg callback variant works', () => {
		const controller = new AbortController()
		const onClick = vi.fn()

		const button = createButton({ on: { click: onClick } }, controller.signal)
		button.click()

		expect(onClick).toHaveBeenCalledOnce()
	})

	test('optional callback — element works fine when options.on?.click is undefined', () => {
		const controller = new AbortController()
		// No on prop at all — should not throw
		const button = createButton({}, controller.signal)
		expect(() => button.click()).not.toThrow()
	})

	test('callback stops firing after simulated component unmount (abort signal)', () => {
		const controller = new AbortController()
		const onClick = vi.fn()

		const button = createButton({ on: { click: onClick } }, controller.signal)
		button.click()
		expect(onClick).toHaveBeenCalledOnce()

		// Simulate component unmount
		controller.abort()
		button.click()
		expect(onClick).toHaveBeenCalledOnce() // still just once
	})
})

describe('EventHandler<tag, event> — type-level guarantees', () => {
	test('EventHandler<"input", "input"> accepts a typed handler', () => {
		// Compile-time check: handler parameter is TargetedEvent<Event, HTMLInputElement>
		const controller = new AbortController()
		const element = createElementFactory(document.createElement.bind(document), controller.signal)

		let capturedTarget: HTMLInputElement | null = null
		const input = element('input', {
			on: {
				input(e) {
					// e.currentTarget must be HTMLInputElement — access its .value
					capturedTarget = e.currentTarget
					void e.currentTarget.value
				},
			},
		})

		input.dispatchEvent(new Event('input'))
		expect(capturedTarget).toBe(input)
	})

	test('EventHandler with change on form element types currentTarget as HTMLFormElement', () => {
		const controller = new AbortController()
		const element = createElementFactory(document.createElement.bind(document), controller.signal)

		let capturedTarget: HTMLFormElement | null = null
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
