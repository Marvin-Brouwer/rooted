import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

import { cssArtifacts, type CssModule } from '../src/component/css-artifacts.mts'
import { applyContentStyleFallback, injectStyles } from '../src/component/styles.mts'

function connectedHost() {
	const host = document.createElement('r--')
	document.body.append(host)
	return host
}

function stubComputedDisplay(display: string) {
	vi.stubGlobal('getComputedStyle', () => ({ display }))
}

function cssModule(href: string): CssModule {
	return { [cssArtifacts]: { href, scopeId: 'test-scope' } } as CssModule
}

function stylesheetLinks(href: string) {
	return [...document.head.querySelectorAll('link[rel="stylesheet"]')]
		.filter(link => link.getAttribute('href') === href)
}

beforeAll(() => {
	// happy-dom fetches every stylesheet link it sees, and there's no server behind these
	window.happyDOM.settings.disableCSSFileLoading = true
	window.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true
})

afterEach(() => {
	vi.unstubAllGlobals()
	document.body.replaceChildren()
	document.head.replaceChildren()
})

// injectStyles remembers every href for the life of the module, so each test uses its own
describe('injectStyles', () => {
	test('adds a stylesheet link to the head', () => {
		// Act
		injectStyles(cssModule('/assets/card.css'))

		// Assert
		expect(stylesheetLinks('/assets/card.css')).toHaveLength(1)
	})

	test('adds the link once, however many times it is asked', () => {
		// Arrange
		injectStyles(cssModule('/assets/list.css'))

		// Act
		injectStyles(cssModule('/assets/list.css'))

		// Assert
		expect(stylesheetLinks('/assets/list.css')).toHaveLength(1)
	})

	test('reuses the link a pre-rendered page already has in its head', () => {
		// Arrange
		document.head.innerHTML = '<link rel="stylesheet" href="/assets/hero.css">'
		const preRenderedLink = document.head.querySelector('link')

		// Act
		injectStyles(cssModule('/assets/hero.css'))

		// Assert
		expect(stylesheetLinks('/assets/hero.css')).toEqual([preRenderedLink])
	})
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
