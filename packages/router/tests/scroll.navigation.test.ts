import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import {
	currentEntryState,
	getSavedScrollOffset,
	registerScrollSaving,
	saveScrollOffsets,
	type ScrollRegistration,
} from '../src/scroll.mts'

const ROUTER_KEY = '@rooted/router'

type NavigateListener = (event: { navigationType: string }) => void

/**
 * Stands in for the Navigation API, which happy-dom doesn't have. Only the three things `scroll.navigation.mts` touches:
 * the current entry's state,
 * updating it, and the `navigate` event.
 */
function fakeNavigation() {
	const listeners = new Set<NavigateListener>()
	let state: unknown

	return {
		currentEntry: { getState: () => state },
		updateCurrentEntry: (options: { state: unknown }) => { state = options.state },
		addEventListener: (_type: string, listener: NavigateListener) => void listeners.add(listener),
		removeEventListener: (_type: string, listener: NavigateListener) => void listeners.delete(listener),
		/** Fires a `navigate` event the way a real browser would, before the entry switches. */
		go: (navigationType: string) => {
			for (const listener of listeners) listener({ navigationType })
		},
	}
}

function scrollContainer(scrollTop = 0, scrollLeft = 0) {
	return { scrollTop, scrollLeft } as unknown as Element
}

let navigationApi: ReturnType<typeof fakeNavigation>
let registrations: ScrollRegistration[] = []

function register(target?: Element) {
	const registration = registerScrollSaving(target)
	registrations.push(registration)
	return registration
}

beforeEach(() => {
	history.replaceState(undefined, '', '/start/')
	navigationApi = fakeNavigation()
	Object.defineProperty(globalThis, 'navigation', { value: navigationApi, configurable: true, writable: true })
	registrations = []
})

afterEach(() => {
	for (const registration of registrations) registration.unregister()
	Reflect.deleteProperty(globalThis, 'navigation')
})

describe('saving on back and forward', () => {
	test('saves the outgoing offset when the browser traverses', () => {
		// Arrange
		const { id } = register(scrollContainer(900, 20))

		// Act
		navigationApi.go('traverse')

		// Assert
		expect(getSavedScrollOffset(navigationApi.currentEntry.getState(), id)).toEqual([20, 900])
	})

	test('ignores a push, which navigate() has already saved for', () => {
		// Arrange
		register(scrollContainer(900))

		// Act
		navigationApi.go('push')

		// Assert
		expect(navigationApi.currentEntry.getState()).toBeUndefined()
	})

	test('ignores a replace, which overwrites the entry it is on', () => {
		// Arrange
		register(scrollContainer(900))

		// Act
		navigationApi.go('replace')

		// Assert
		expect(navigationApi.currentEntry.getState()).toBeUndefined()
	})

	test('keeps whatever else the entry state was carrying', () => {
		// Arrange
		navigationApi.updateCurrentEntry({ state: { modal: 'confirm' } })
		const { id } = register(scrollContainer(900))

		// Act
		navigationApi.go('traverse')

		// Assert
		expect(navigationApi.currentEntry.getState()).toEqual({
			modal: 'confirm',
			[ROUTER_KEY]: { [id]: [0, 900] },
		})
	})

	test('stops saving once the last router unregisters', () => {
		// Arrange
		const { unregister } = register(scrollContainer(900))

		// Act
		unregister()
		navigationApi.go('traverse')

		// Assert
		expect(navigationApi.currentEntry.getState()).toBeUndefined()
	})
})

describe('saveScrollOffsets() with a Navigation API', () => {
	test('writes both stores, so the Navigation API one is never the staler', () => {
		// Arrange
		const { id } = register(scrollContainer(120, 5))

		// Act
		saveScrollOffsets()

		// Assert
		expect(getSavedScrollOffset(history.state, id)).toEqual([5, 120])
		expect(getSavedScrollOffset(navigationApi.currentEntry.getState(), id)).toEqual([5, 120])
	})
})

describe('currentEntryState()', () => {
	test('prefers the Navigation API state, because only it is written on a traverse', () => {
		// Arrange
		history.replaceState({ [ROUTER_KEY]: { '#1': [0, 111] } }, '')
		navigationApi.updateCurrentEntry({ state: { [ROUTER_KEY]: { '#1': [0, 222] } } })

		// Act + Assert
		expect(getSavedScrollOffset(currentEntryState(), '#1')).toEqual([0, 222])
	})

	test('falls back to history.state for an entry the Navigation API has nothing for', () => {
		// Arrange
		history.replaceState({ [ROUTER_KEY]: { '#1': [0, 111] } }, '')

		// Act + Assert
		expect(getSavedScrollOffset(currentEntryState(), '#1')).toEqual([0, 111])
	})
})
