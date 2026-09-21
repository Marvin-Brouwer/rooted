import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
	getSavedScrollOffset,
	registerScrollSaving,
	restoreScrollOffset,
	restoreScrollPosition,
	saveScrollOffsets,
	scrollToOffset,
	type ScrollRegistration,
} from '../src/scroll.mts'

const ROUTER_KEY = '@rooted/router'

type TestContainer = Element & { scrollTo: ReturnType<typeof vi.fn> }

/** A stand-in for a custom scroll container, which is all the module reads off one. */
function scrollContainer(scrollTop = 0, scrollLeft = 0) {
	return { scrollTop, scrollLeft, scrollTo: vi.fn() } as unknown as TestContainer
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

describe('saveScrollOffsets()', () => {
	test('does nothing while no router is registered', () => {
		// Arrange
		history.replaceState({ modal: 'confirm' }, '')

		// Act
		saveScrollOffsets()

		// Assert
		expect(history.state).toEqual({ modal: 'confirm' })
	})

	test('saves both axes of a container under the router id', () => {
		// Arrange
		const { id } = register(scrollContainer(420, 35))

		// Act
		saveScrollOffsets()

		// Assert
		expect(getSavedScrollOffset(history.state, id)).toEqual([35, 420])
	})

	test('saves each registered router separately', () => {
		// Arrange
		const first = register(scrollContainer(420))
		const second = register(scrollContainer(75))

		// Act
		saveScrollOffsets()

		// Assert
		expect(getSavedScrollOffset(history.state, first.id)).toEqual([0, 420])
		expect(getSavedScrollOffset(history.state, second.id)).toEqual([0, 75])
	})

	test('keeps the history state that was already there', () => {
		// Arrange
		history.replaceState({ modal: 'confirm' }, '')
		const { id } = register(scrollContainer(120))

		// Act
		saveScrollOffsets()

		// Assert
		expect(history.state).toEqual({ modal: 'confirm', [ROUTER_KEY]: { [id]: [0, 120] } })
	})

	test('reads the window scroll for a router with no custom container', () => {
		// Arrange
		vi.spyOn(window, 'scrollY', 'get').mockReturnValue(66)
		vi.spyOn(window, 'scrollX', 'get').mockReturnValue(12)
		const { id } = register()

		// Act
		saveScrollOffsets()

		// Assert
		expect(getSavedScrollOffset(history.state, id)).toEqual([12, 66])
	})

	test('stops saving for a router that unregistered', () => {
		// Arrange
		const { id, unregister } = register(scrollContainer(300))
		register(scrollContainer(10))

		// Act
		unregister()
		saveScrollOffsets()

		// Assert
		expect(getSavedScrollOffset(history.state, id)).toBeUndefined()
	})
})

describe('getSavedScrollOffset()', () => {
	test.each([
		// eslint-disable-next-line unicorn/no-null
		['null', null],
		['a string', '300'],
		['state without router state', { modal: 'confirm' }],
		['router state that is not an object', { [ROUTER_KEY]: 300 }],
		['no offset for this router', { [ROUTER_KEY]: { '#99': [300, 0] } }],
		['an offset that is not an array', { [ROUTER_KEY]: { '#1': 300 } }],
		['an offset of the wrong length', { [ROUTER_KEY]: { '#1': [300] } }],
		['an offset that is not numbers', { [ROUTER_KEY]: { '#1': ['300', '0'] } }],
	])('returns undefined for %s', (_name, state) => {
		// Act + Assert
		expect(getSavedScrollOffset(state, '#1')).toBeUndefined()
	})

	test('returns the saved offset', () => {
		// Act + Assert
		expect(getSavedScrollOffset({ [ROUTER_KEY]: { '#1': [300, 20] } }, '#1')).toEqual([300, 20])
	})

	test('returns an offset at the origin', () => {
		// Act + Assert
		expect(getSavedScrollOffset({ [ROUTER_KEY]: { '#1': [0, 0] } }, '#1')).toEqual([0, 0])
	})
})

describe('scrollToOffset()', () => {
	test('sets both axes on a container, x then y', () => {
		// Arrange
		const container = scrollContainer()

		// Act
		scrollToOffset([250, 40], container)

		// Assert
		expect(container.scrollLeft).toBe(250)
		expect(container.scrollTop).toBe(40)
	})

	test('scrolls a container back to the origin through scrollTo', () => {
		// Arrange
		const container = scrollContainer(250, 40)

		// Act
		scrollToOffset([0, 0], container)

		// Assert
		expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
	})

	test('scrolls the window when there is no container', () => {
		// Arrange
		const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

		// Act
		scrollToOffset([250, 40])

		// Assert
		expect(scrollTo).toHaveBeenCalledWith({ top: 40, left: 250, behavior: 'instant' })
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

	test('scrolls every router back to its own saved offset', () => {
		// Arrange
		const first = scrollContainer(480, 15)
		const second = scrollContainer(90)
		register(first)
		register(second)
		saveScrollOffsets()
		first.scrollTop = 0
		first.scrollLeft = 0
		second.scrollTop = 0

		// Act
		const restored = restoreScrollPosition()

		// Assert
		expect(restored).toBe(true)
		expect([first.scrollTop, first.scrollLeft]).toEqual([480, 15])
		expect(second.scrollTop).toBe(90)
	})

	test('leaves a router with nothing saved where it is', () => {
		// Arrange
		const saved = scrollContainer(480)
		register(saved)
		saveScrollOffsets()
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

describe('restoreScrollOffset()', () => {
	/**
	 * A container that clamps like a real one. `maxScroll` starts small, the way a route does before its content has mounted,
	 * and `grow()` is the content arriving.
	 */
	function clampingContainer(maxScroll: number) {
		const container = {
			scrollLeft: 0,
			_scrollTop: 0,
			maxScroll,
			attempts: 0,
			get scrollTop() { return this._scrollTop },
			set scrollTop(value: number) {
				this.attempts++
				this._scrollTop = Math.min(value, this.maxScroll)
			},
			scrollTo() { this._scrollTop = 0 },
			grow(to: number) { this.maxScroll = to },
		}

		return container
	}

	test('lands on the offset once the route content has arrived', async () => {
		// Arrange
		const container = clampingContainer(100)

		// Act
		restoreScrollOffset([0, 600], container as unknown as Element)
		expect(container.scrollTop).toBe(100)
		container.grow(900)
		await new Promise(resolve => setTimeout(resolve, 100))

		// Assert
		expect(container.scrollTop).toBe(600)
	})

	test('gives up rather than re-applying forever on a page that stays short', async () => {
		// Arrange
		const container = clampingContainer(100)

		// Act
		restoreScrollOffset([0, 600], container as unknown as Element)
		await new Promise(resolve => setTimeout(resolve, 300))

		// Assert
		expect(container.scrollTop).toBe(100)
		expect(container.attempts).toBeLessThanOrEqual(20)
	})
})
