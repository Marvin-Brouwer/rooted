import { afterEach, describe, expect, test, vi } from 'vitest'

import { applyContentStyleFallback } from '../src/component/styles.mts'

function connectedHost() {
	const host = document.createElement('r--')
	document.body.append(host)
	return host
}

function stubComputedDisplay(display: string) {
	vi.stubGlobal('getComputedStyle', () => ({ display }))
}

afterEach(() => {
	vi.unstubAllGlobals()
	document.body.replaceChildren()
})

describe('applyContentStyleFallback', () => {
	test('applies the inline display when the element is not already display: contents', () => {
		// Arrange
		const host = connectedHost()
		stubComputedDisplay('inline')

		// Act
		applyContentStyleFallback(host)

		// Assert
		expect(host.style.getPropertyValue('display')).toBe('contents')
		expect(host.style.getPropertyPriority('display')).toBe('important')
	})

	test('leaves the element alone when the style sheet already applied', () => {
		// Arrange
		const host = connectedHost()
		stubComputedDisplay('contents')

		// Act
		applyContentStyleFallback(host)

		// Assert
		expect(host.getAttribute('style')).toBeNull()
	})

	test('leaves the element alone when the environment cannot compute style', () => {
		// Arrange
		// Pre-rendering answers an empty string for every property on every element, which says
		// nothing about whether the rule applied. See issue #328.
		const host = connectedHost()
		stubComputedDisplay('')

		// Act
		applyContentStyleFallback(host)

		// Assert
		expect(host.getAttribute('style')).toBeNull()
	})
})
