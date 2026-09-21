import { afterEach, describe, expect, test, vi } from 'vitest'

import { intersectionObserver } from '../src/intersection-observer.mts'

import { only, stubObserver } from './fake-observer.ts'

function stub() {
	return stubObserver<IntersectionObserverEntry>('IntersectionObserver')
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('intersectionObserver', () => {
	test('passes the init options to the constructor', () => {
		// Arrange
		const instances = stub()
		const element = document.createElement('div')

		// Act
		intersectionObserver({
			on: { intersect() {} },
			rootMargin: '0px 0px -10% 0px',
			signal: new AbortController().signal,
			targets: element,
			threshold: 0.5,
		})

		// Assert
		expect(only(instances).init).toEqual({ rootMargin: '0px 0px -10% 0px', threshold: 0.5 })
	})

	test('observes a single target', () => {
		// Arrange
		const instances = stub()
		const element = document.createElement('div')

		// Act
		intersectionObserver({
			on: { intersect() {} },
			signal: new AbortController().signal,
			targets: element,
		})

		// Assert
		expect(only(instances).observed).toEqual([{ options: undefined, target: element }])
	})

	test('observes every target in an iterable', () => {
		// Arrange
		const instances = stub()
		const list = document.createElement('ul')
		list.append(document.createElement('li'), document.createElement('li'))

		// Act
		intersectionObserver({
			on: { intersect() {} },
			signal: new AbortController().signal,
			targets: list.querySelectorAll('li'),
		})

		// Assert
		expect(only(instances).observed.map(call => call.target)).toEqual([...list.children])
	})

	test('hands the handler the entries and the observer', () => {
		// Arrange
		const instances = stub()
		const intersect = vi.fn()
		const observer = intersectionObserver({
			on: { intersect },
			signal: new AbortController().signal,
			targets: document.createElement('div'),
		})
		const entries = [{ isIntersecting: true } as IntersectionObserverEntry]

		// Act
		only(instances).trigger(entries)

		// Assert
		expect(intersect).toHaveBeenCalledWith({ entries, observer })
	})

	test('returns the observer, so a handler can disconnect it', () => {
		// Arrange
		const instances = stub()
		const observer = intersectionObserver({
			on: {
				intersect({ observer: reported }) {
					reported.disconnect()
				},
			},
			signal: new AbortController().signal,
			targets: document.createElement('div'),
		})

		// Act
		only(instances).trigger([])

		// Assert
		expect(only(instances).disconnectCount).toBe(1)
		expect(observer).toBe(only(instances) as unknown as IntersectionObserver)
	})

	test('fires a handler that takes no arguments', () => {
		// Arrange
		const instances = stub()
		const intersect = vi.fn(() => {})
		intersectionObserver({
			on: { intersect },
			signal: new AbortController().signal,
			targets: document.createElement('div'),
		})

		// Act
		only(instances).trigger([])

		// Assert
		expect(intersect).toHaveBeenCalledOnce()
	})

	test('does not await an async handler', () => {
		// Arrange
		const instances = stub()
		let resolved = false
		intersectionObserver({
			on: {
				async intersect() {
					await Promise.resolve()
					resolved = true
				},
			},
			signal: new AbortController().signal,
			targets: document.createElement('div'),
		})

		// Act
		only(instances).trigger([])

		// Assert
		expect(resolved).toBe(false)
	})

	test('disconnects once when the signal aborts, however many targets there are', () => {
		// Arrange
		const instances = stub()
		const controller = new AbortController()
		intersectionObserver({
			on: { intersect() {} },
			signal: controller.signal,
			targets: [document.createElement('div'), document.createElement('div')],
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
		intersectionObserver({
			on: { intersect() {} },
			signal: controller.signal,
			targets: document.createElement('div'),
		})

		// Assert
		expect(only(instances).observed).toEqual([])
	})
})
