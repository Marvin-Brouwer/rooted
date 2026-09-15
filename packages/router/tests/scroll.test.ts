import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
	getSavedScrollPosition,
	registerScrollSaving,
	restoreScrollPosition,
	saveScrollPositions,
	scrollToPosition,
	type ScrollRegistration,
} from '../src/scroll.mts'

const SCROLL_KEY = '@rooted/scrollY'

/** A stand-in for a custom scroll container, which is all the module reads off one. */
function scrollContainer(scrollTop = 0) {
	return { scrollTop, scrollTo: vi.fn() } as unknown as Element & { scrollTo: ReturnType<typeof vi.fn> }
}

/** The registry is module state, so every test hands back whatever it signed up. */
let registrations: ScrollRegistration[] = []

function register(target?: Element) {
	const registration = registerScrollSaving(target)
	registrations.push(registration)
	return registration
}

beforeEach(() => {
	registrations = []
	history.replaceState(undefined, '', '/start/')
})

afterEach(() => {
	for (const registration of registrations) registration.unregister()
	vi.restoreAllMocks()
})

describe('registerScrollSaving()', () => {
	test('hands every router its own id', () => {
		// Act
		const first = register()
		const second = register()

		// Assert
		expect(first.id).not.toBe(second.id)
	})

	test('takes scroll restoration off the browser while a router is registered', () => {
		// Act
		register()

		// Assert
		expect(history.scrollRestoration).toBe('manual')
	})

	test('keeps it while any other router is still registered', () => {
		// Arrange
		const first = register()
		register()

		// Act
		first.unregister()

		// Assert
		expect(history.scrollRestoration).toBe('manual')
	})

	test('gives scroll restoration back when the last router unregisters', () => {
		// Arrange
		const first = register()
		const second = register()

		// Act
		first.unregister()
		second.unregister()

		// Assert
		expect(history.scrollRestoration).toBe('auto')
	})
})

describe('saveScrollPositions()', () => {
	test('does nothing while no router is registered', () => {
		// Arrange
		history.replaceState({ modal: 'confirm' }, '')

		// Act
		saveScrollPositions()

		// Assert
		expect(history.state).toEqual({ modal: 'confirm' })
	})

	test('saves the scroll position under the router id', () => {
		// Arrange
		const { id } = register(scrollContainer(420))

		// Act
		saveScrollPositions()

		// Assert
		expect(getSavedScrollPosition(history.state, id)).toBe(420)
	})

	test('saves each registered router separately', () => {
		// Arrange
		const first = register(scrollContainer(420))
		const second = register(scrollContainer(75))

		// Act
		saveScrollPositions()

		// Assert
		expect(getSavedScrollPosition(history.state, first.id)).toBe(420)
		expect(getSavedScrollPosition(history.state, second.id)).toBe(75)
	})

	test('keeps the history state that was already there', () => {
		// Arrange
		history.replaceState({ modal: 'confirm' }, '')
		const { id } = register(scrollContainer(120))

		// Act
		saveScrollPositions()

		// Assert
		expect(history.state).toEqual({ modal: 'confirm', [SCROLL_KEY]: { [id]: 120 } })
	})

	test('reads window.scrollY for a router with no custom container', () => {
		// Arrange
		vi.spyOn(window, 'scrollY', 'get').mockReturnValue(66)
		const { id } = register()

		// Act
		saveScrollPositions()

		// Assert
		expect(getSavedScrollPosition(history.state, id)).toBe(66)
	})

	test('stops saving for a router that unregistered', () => {
		// Arrange
		const { id, unregister } = register(scrollContainer(300))
		register(scrollContainer(10))

		// Act
		unregister()
		saveScrollPositions()

		// Assert
		expect(getSavedScrollPosition(history.state, id)).toBeUndefined()
	})
})

describe('getSavedScrollPosition()', () => {
	test.each([
		// eslint-disable-next-line unicorn/no-null
		['null', null],
		['a string', '300'],
		['state without saved positions', { modal: 'confirm' }],
		['saved positions that are not an object', { [SCROLL_KEY]: 300 }],
		['no position for this router', { [SCROLL_KEY]: { 'router#99': 300 } }],
		['a position that is not a number', { [SCROLL_KEY]: { 'router#1': '300' } }],
	])('returns undefined for %s', (_name, state) => {
		// Act + Assert
		expect(getSavedScrollPosition(state, 'router#1')).toBeUndefined()
	})

	test('returns the saved position', () => {
		// Act + Assert
		expect(getSavedScrollPosition({ [SCROLL_KEY]: { 'router#1': 300 } }, 'router#1')).toBe(300)
	})

	test('returns a saved position of zero', () => {
		// Act + Assert
		expect(getSavedScrollPosition({ [SCROLL_KEY]: { 'router#1': 0 } }, 'router#1')).toBe(0)
	})
})

describe('scrollToPosition()', () => {
	test('sets scrollTop on a container', () => {
		// Arrange
		const container = scrollContainer()

		// Act
		scrollToPosition(250, container)

		// Assert
		expect(container.scrollTop).toBe(250)
	})

	test('scrolls a container back to the top through scrollTo', () => {
		// Arrange
		const container = scrollContainer(250)

		// Act
		scrollToPosition(0, container)

		// Assert
		expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
	})

	test('scrolls the window when there is no container', () => {
		// Arrange
		const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

		// Act
		scrollToPosition(250)

		// Assert
		expect(scrollTo).toHaveBeenCalledWith({ top: 250, behavior: 'instant' })
	})
})

describe('restoreScrollPosition()', () => {
	test('reports there was nothing to restore', () => {
		// Arrange
		const container = scrollContainer()
		register(container)

		// Act
		const restored = restoreScrollPosition()

		// Assert
		expect(restored).toBe(false)
		expect(container.scrollTop).toBe(0)
	})

	test('scrolls every router back to its own saved position', () => {
		// Arrange
		const first = scrollContainer(480)
		const second = scrollContainer(90)
		register(first)
		register(second)
		saveScrollPositions()
		first.scrollTop = 0
		second.scrollTop = 0

		// Act
		const restored = restoreScrollPosition()

		// Assert
		expect(restored).toBe(true)
		expect(first.scrollTop).toBe(480)
		expect(second.scrollTop).toBe(90)
	})

	test('leaves a router with nothing saved where it is', () => {
		// Arrange
		const saved = scrollContainer(480)
		register(saved)
		saveScrollPositions()
		saved.scrollTop = 0
		const latecomer = scrollContainer(35)
		register(latecomer)

		// Act
		restoreScrollPosition()

		// Assert
		expect(saved.scrollTop).toBe(480)
		expect(latecomer.scrollTop).toBe(35)
	})
})
