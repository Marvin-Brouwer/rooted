import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { path, url } from '../src/href.mts'
import { navigate } from '../src/navigation.mts'
import { enableScrollSaving, getSavedScrollPosition } from '../src/scroll.mts'

/** The `popstate` events dispatched during the current test, in order. */
let events: PopStateEvent[] = []
let listener: AbortController
/** Scroll saving is module state, so every test has to hand back what it switched on. */
let disableScrollSaving: (() => void) | undefined

/** A stand-in for a custom scroll container, which is all the scroll module reads off one. */
function scrollContainer(scrollTop: number) {
	return { scrollTop } as unknown as Element
}

beforeEach(() => {
	events = []
	listener = new AbortController()
	globalThis.addEventListener(
		'popstate',
		(event) => events.push(event as PopStateEvent),
		{ signal: listener.signal },
	)

	history.pushState(undefined, '', '/start/')
})

afterEach(() => {
	listener.abort()
	disableScrollSaving?.()
	disableScrollSaving = undefined
	vi.restoreAllMocks()
})

describe('navigate()', () => {
	test('pushes a new history entry for a string href', () => {
		// Arrange
		const entriesBefore = history.length

		// Act
		navigate('/categories/italian/')

		// Assert
		expect(location.pathname).toBe('/categories/italian/')
		expect(history.length).toBe(entriesBefore + 1)
	})

	test('dispatches a popstate event so the router re-evaluates the URL', () => {
		// Act
		navigate('/categories/italian/')

		// Assert
		expect(events).toHaveLength(1)
		expect(events[0].state).toBeNull()
	})

	test('accepts a Path', () => {
		// Act
		navigate(path('/categories/italian/'))

		// Assert
		expect(location.pathname).toBe('/categories/italian/')
	})

	test('accepts a Url', () => {
		// Act
		navigate(url(`${location.origin}/categories/italian/`))

		// Assert
		expect(location.pathname).toBe('/categories/italian/')
	})

	test('replaces the current entry instead of pushing when called through replace', () => {
		// Arrange
		const entriesBefore = history.length

		// Act
		navigate.replace('/en/')

		// Assert
		expect(location.pathname).toBe('/en/')
		expect(history.length).toBe(entriesBefore)
		expect(events).toHaveLength(1)
	})

	test('pushes history state without changing the URL', () => {
		// Arrange
		const entriesBefore = history.length

		// Act
		navigate({ modal: 'confirm', id: 42 })

		// Assert
		expect(location.pathname).toBe('/start/')
		expect(history.state).toEqual({ modal: 'confirm', id: 42 })
		expect(history.length).toBe(entriesBefore + 1)
	})

	test('passes the pushed state along on the popstate event', () => {
		// Act
		navigate({ modal: 'confirm', id: 42 })

		// Assert
		expect(events).toHaveLength(1)
		expect(events[0].state).toEqual({ modal: 'confirm', id: 42 })
	})

	test('replaces the current entry for a state-only navigation through replace', () => {
		// Arrange
		const entriesBefore = history.length

		// Act
		navigate.replace({ modal: 'confirm' })

		// Assert
		expect(location.pathname).toBe('/start/')
		expect(history.state).toEqual({ modal: 'confirm' })
		expect(history.length).toBe(entriesBefore)
	})
})

describe('navigate() scroll saving', () => {
	test('saves the scroll position onto the entry it leaves, before pushing', () => {
		// Arrange
		disableScrollSaving = enableScrollSaving(scrollContainer(540))
		const replaceState = vi.spyOn(history, 'replaceState')
		const pushState = vi.spyOn(history, 'pushState')

		// Act
		navigate('/categories/italian/')

		// Assert
		expect(getSavedScrollPosition(replaceState.mock.calls[0][0])).toBe(540)
		expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan(pushState.mock.invocationCallOrder[0])
	})

	test('leaves the entry alone when scroll saving is off', () => {
		// Arrange
		const replaceState = vi.spyOn(history, 'replaceState')

		// Act
		navigate('/categories/italian/')

		// Assert
		expect(replaceState).not.toHaveBeenCalled()
	})

	test('saves nothing for a replace, because that entry is being overwritten', () => {
		// Arrange
		disableScrollSaving = enableScrollSaving(scrollContainer(540))

		// Act
		navigate.replace('/en/')

		// Assert
		expect(getSavedScrollPosition(history.state)).toBeUndefined()
	})
})
