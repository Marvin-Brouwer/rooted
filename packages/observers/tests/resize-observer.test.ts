import { afterEach, describe, expect, test, vi } from 'vitest'

import { resizeObserver } from '../src/resize-observer.mts'

import { only, stubObserver } from './fake-observer.ts'

function stub() {
	return stubObserver<ResizeObserverEntry>('ResizeObserver')
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('resizeObserver', () => {
	test('passes the box to observe, not to the constructor', () => {
		// Arrange
		const instances = stub()
		const element = document.createElement('div')

		// Act
		resizeObserver({
			box: 'border-box',
			on: { resize() {} },
			signal: new AbortController().signal,
			targets: element,
		})

		// Assert
		expect(only(instances).init).toBeUndefined()
		expect(only(instances).observed).toEqual([{ options: { box: 'border-box' }, target: element }])
	})

	test('observes every target in an iterable', () => {
		// Arrange
		const instances = stub()
		const first = document.createElement('div')
		const second = document.createElement('div')

		// Act
		resizeObserver({
			on: { resize() {} },
			signal: new AbortController().signal,
			targets: [first, second],
		})

		// Assert
		expect(only(instances).observed.map(call => call.target)).toEqual([first, second])
	})

	test('hands the handler the entries and the observer', () => {
		// Arrange
		const instances = stub()
		const resize = vi.fn()
		const observer = resizeObserver({
			on: { resize },
			signal: new AbortController().signal,
			targets: document.createElement('div'),
		})
		const entries = [{ contentRect: new DOMRect() } as ResizeObserverEntry]

		// Act
		only(instances).trigger(entries)

		// Assert
		expect(resize).toHaveBeenCalledWith({ entries, observer })
	})

	test('disconnects when the signal aborts', () => {
		// Arrange
		const instances = stub()
		const controller = new AbortController()
		resizeObserver({
			on: { resize() {} },
			signal: controller.signal,
			targets: document.createElement('div'),
		})

		// Act
		controller.abort()

		// Assert
		expect(only(instances).disconnectCount).toBe(1)
	})

	test('observes nothing when the signal has already aborted', () => {
		// Arrange
		const instances = stub()
		const controller = new AbortController()
		controller.abort()

		// Act
		resizeObserver({
			on: { resize() {} },
			signal: controller.signal,
			targets: document.createElement('div'),
		})

		// Assert
		expect(only(instances).observed).toEqual([])
	})
})
