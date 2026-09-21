import { afterEach, describe, expect, test, vi } from 'vitest'

import { mutationObserver } from '../src/mutation-observer.mts'

import { only, stubObserver } from './fake-observer.ts'

function stub() {
	return stubObserver<MutationRecord>('MutationObserver')
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('mutationObserver', () => {
	test('passes the init options to observe, not to the constructor', () => {
		// Arrange
		const instances = stub()
		const element = document.createElement('div')

		// Act
		mutationObserver({
			attributeFilter: ['data-theme'],
			attributes: true,
			on: { mutate() {} },
			signal: new AbortController().signal,
			targets: element,
		})

		// Assert
		expect(only(instances).init).toBeUndefined()
		expect(only(instances).observed).toEqual([
			{ options: { attributeFilter: ['data-theme'], attributes: true }, target: element },
		])
	})

	test('observes every target in an iterable with the same options', () => {
		// Arrange
		const instances = stub()
		const first = document.createElement('div')
		const second = document.createElement('div')

		// Act
		mutationObserver({
			childList: true,
			on: { mutate() {} },
			signal: new AbortController().signal,
			targets: [first, second],
		})

		// Assert
		expect(only(instances).observed).toEqual([
			{ options: { childList: true }, target: first },
			{ options: { childList: true }, target: second },
		])
	})

	test('hands the handler the records as entries', () => {
		// Arrange
		const instances = stub()
		const mutate = vi.fn()
		const observer = mutationObserver({
			attributes: true,
			on: { mutate },
			signal: new AbortController().signal,
			targets: document.createElement('div'),
		})
		const entries = [{ type: 'attributes' } as MutationRecord]

		// Act
		only(instances).trigger(entries)

		// Assert
		expect(mutate).toHaveBeenCalledWith({ entries, observer })
	})

	test('disconnects when the signal aborts', () => {
		// Arrange
		const instances = stub()
		const controller = new AbortController()
		mutationObserver({
			attributes: true,
			on: { mutate() {} },
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
		mutationObserver({
			attributes: true,
			on: { mutate() {} },
			signal: controller.signal,
			targets: document.createElement('div'),
		})

		// Assert
		expect(only(instances).observed).toEqual([])
	})
})
