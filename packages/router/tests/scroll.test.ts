import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
	enableScrollSaving,
	getSavedScrollPosition,
	restoreScrollPosition,
	saveScrollPosition,
	scrollToPosition,
} from '../src/scroll.mts'

const SCROLL_KEY = '@rooted/scrollY'

/** A stand-in for a custom scroll container, which is all the module reads off one. */
function scrollContainer(scrollTop = 0) {
	return { scrollTop, scrollTo: vi.fn() } as unknown as Element & { scrollTo: ReturnType<typeof vi.fn> }
}

/** Scroll saving is module state, so every test has to hand back what it switched on. */
let disableScrollSaving: (() => void) | undefined

beforeEach(() => {
	history.replaceState(undefined, '', '/start/')
})

afterEach(() => {
	disableScrollSaving?.()
	disableScrollSaving = undefined
	vi.restoreAllMocks()
})

describe('saveScrollPosition()', () => {
	test('does nothing until a router switches scroll saving on', () => {
		// Act
		saveScrollPosition()

		// Assert
		expect(getSavedScrollPosition(history.state)).toBeUndefined()
	})

	test('writes the scroll position of the registered container', () => {
		// Arrange
		disableScrollSaving = enableScrollSaving(scrollContainer(420))

		// Act
		saveScrollPosition()

		// Assert
		expect(getSavedScrollPosition(history.state)).toBe(420)
	})

	test('keeps the history state that was already there', () => {
		// Arrange
		history.replaceState({ modal: 'confirm' }, '')
		disableScrollSaving = enableScrollSaving(scrollContainer(120))

		// Act
		saveScrollPosition()

		// Assert
		expect(history.state).toEqual({ modal: 'confirm', [SCROLL_KEY]: 120 })
	})

	test('reads window.scrollY when no container was registered', () => {
		// Arrange
		vi.spyOn(window, 'scrollY', 'get').mockReturnValue(66)
		disableScrollSaving = enableScrollSaving()

		// Act
		saveScrollPosition()

		// Assert
		expect(getSavedScrollPosition(history.state)).toBe(66)
	})

	test('stops writing once scroll saving is switched off again', () => {
		// Arrange
		enableScrollSaving(scrollContainer(300))()

		// Act
		saveScrollPosition()

		// Assert
		expect(getSavedScrollPosition(history.state)).toBeUndefined()
	})
})

describe('getSavedScrollPosition()', () => {
	test.each([
		// eslint-disable-next-line unicorn/no-null
		['null', null],
		['a string', '300'],
		['state without a saved position', { modal: 'confirm' }],
		['a saved position that is not a number', { [SCROLL_KEY]: '300' }],
	])('returns undefined for %s', (_name, state) => {
		// Act + Assert
		expect(getSavedScrollPosition(state)).toBeUndefined()
	})

	test('returns the saved position', () => {
		// Act + Assert
		expect(getSavedScrollPosition({ [SCROLL_KEY]: 300 })).toBe(300)
	})

	test('returns a saved position of zero', () => {
		// Act + Assert
		expect(getSavedScrollPosition({ [SCROLL_KEY]: 0 })).toBe(0)
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

		// Act
		const restored = restoreScrollPosition(container)

		// Assert
		expect(restored).toBe(false)
		expect(container.scrollTop).toBe(0)
	})

	test('scrolls to the position saved on the current entry', () => {
		// Arrange
		history.replaceState({ [SCROLL_KEY]: 480 }, '')
		const container = scrollContainer()

		// Act
		const restored = restoreScrollPosition(container)

		// Assert
		expect(restored).toBe(true)
		expect(container.scrollTop).toBe(480)
	})

	test('falls back to the container the router registered', () => {
		// Arrange
		const container = scrollContainer()
		disableScrollSaving = enableScrollSaving(container)
		history.replaceState({ [SCROLL_KEY]: 480 }, '')

		// Act
		restoreScrollPosition()

		// Assert
		expect(container.scrollTop).toBe(480)
	})
})
