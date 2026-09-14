import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { path, url } from '../src/href.mts'
import { navigate } from '../src/navigation.mts'

/** The `popstate` events dispatched during the current test, in order. */
let events: PopStateEvent[] = []
let listener: AbortController

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

	test('replaces the current entry instead of pushing when replace is set', () => {
		// Arrange
		const entriesBefore = history.length

		// Act
		navigate('/en/', { replace: true })

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

	test('replaces the current entry for a state-only navigation when replace is set', () => {
		// Arrange
		const entriesBefore = history.length

		// Act
		navigate({ modal: 'confirm' }, { replace: true })

		// Assert
		expect(location.pathname).toBe('/start/')
		expect(history.state).toEqual({ modal: 'confirm' })
		expect(history.length).toBe(entriesBefore)
	})
})
