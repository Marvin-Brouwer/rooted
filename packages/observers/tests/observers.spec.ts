/**
 * Spec: observers tied to a component's lifetime.
 *
 * The thing these wrappers exist for is that nobody writes the teardown.
 * A component hands its `signal` to whatever it observes;
 * when it unmounts, the signal aborts and every observer disconnects,
 * whether or not the handler ever ran and whether or not it disconnected itself first.
 */
import { afterEach, describe, expect, test, vi } from 'vitest'

import { intersectionObserver } from '../src/intersection-observer.mts'
import { mutationObserver } from '../src/mutation-observer.mts'
import { resizeObserver } from '../src/resize-observer.mts'

import { stubObserver } from './fake-observer.ts'

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('an observer that disconnects itself', () => {
	test('runs once and stops, the way the reroll in issue #327 does', () => {
		const instances = stubObserver<IntersectionObserverEntry>('IntersectionObserver')
		const reroll = vi.fn()
		const table = document.createElement('table')

		intersectionObserver({
			rootMargin: '0px 0px -10% 0px',
			signal: new AbortController().signal,
			targets: table,
			on: {
				intersect({ entries, observer }) {
					if (!entries.some(entry => entry.isIntersecting)) return
					observer.disconnect()
					reroll()
				},
			},
		})

		const observer = instances[0]!
		observer.trigger([{ isIntersecting: false } as IntersectionObserverEntry])
		expect(reroll).not.toHaveBeenCalled()

		observer.trigger([{ isIntersecting: true } as IntersectionObserverEntry])
		expect(reroll).toHaveBeenCalledOnce()
		expect(observer.disconnectCount).toBe(1)
	})
})

describe('unmounting', () => {
	test('disconnects all three observers, without the caller writing teardown', () => {
		const intersections = stubObserver<IntersectionObserverEntry>('IntersectionObserver')
		const mutations = stubObserver<MutationRecord>('MutationObserver')
		const resizes = stubObserver<ResizeObserverEntry>('ResizeObserver')

		const unmount = new AbortController()
		const element = document.createElement('div')

		intersectionObserver({ on: { intersect() {} }, signal: unmount.signal, targets: element })
		mutationObserver({ attributes: true, on: { mutate() {} }, signal: unmount.signal, targets: element })
		resizeObserver({ on: { resize() {} }, signal: unmount.signal, targets: element })

		unmount.abort('component unmounted')

		expect(intersections[0]!.disconnectCount).toBe(1)
		expect(mutations[0]!.disconnectCount).toBe(1)
		expect(resizes[0]!.disconnectCount).toBe(1)
	})

	test('leaves an observer that already disconnected itself alone', () => {
		const instances = stubObserver<ResizeObserverEntry>('ResizeObserver')
		const unmount = new AbortController()

		const observer = resizeObserver({
			on: { resize() {} },
			signal: unmount.signal,
			targets: document.createElement('div'),
		})
		observer.disconnect()

		expect(() => unmount.abort()).not.toThrow()
		expect(instances[0]!.disconnectCount).toBe(2)
	})
})
