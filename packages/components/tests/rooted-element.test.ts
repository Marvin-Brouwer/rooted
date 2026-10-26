import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { create } from '../src/component-factory.mts'
import { component } from '../src/component.mts'
import { RootedElement } from '../src/rooted-element.mts'

class CountingElement extends RootedElement {
	static tagName = 'counting-element'

	mounts = 0

	protected onMount() {
		this.mounts++
		this.textContent = 'mounted'
	}
}
RootedElement.register(CountingElement)

// The environment checks for happy-dom, so a window without it reads as a browser
function runAsClient() {
	vi.stubGlobal('window', { addEventListener() {} })
}

function settle() {
	return new Promise(resolve => setTimeout(resolve))
}

beforeEach(() => {
	document.body.replaceChildren()
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('RootedElement, in the browser', () => {
	beforeEach(runAsClient)

	test('mounts inside the append that first connects it', () => {
		// Arrange
		const element = document.createElement(CountingElement.tagName) as CountingElement

		// Act
		document.body.append(element)

		// Assert
		expect(element.mounts).toBe(1)
		expect(element.textContent).toBe('mounted')
	})

	test('has a child component\'s content in the parent\'s onMount', () => {
		// Arrange
		const seen: string[] = []
		const Child = component({
			name: 'mount-order-child',
			onMount({ append }) {
				append('hello')
			},
		})
		const Parent = component({
			name: 'mount-order-parent',
			onMount({ append, create }) {
				const child = append(create(Child))
				seen.push(child.textContent ?? '')
			},
		})

		// Act
		document.body.append(create(Parent))

		// Assert
		expect(seen).toEqual(['hello'])
	})

	test('mounts again a microtask after reconnecting', async () => {
		// Arrange
		const element = document.createElement(CountingElement.tagName) as CountingElement
		document.body.append(element)
		element.remove()
		await settle()

		// Act
		document.body.append(element)
		await settle()

		// Assert
		expect(element.mounts).toBe(2)
	})

	test('doesn\'t mount again when it leaves before the microtask runs', async () => {
		// Arrange
		const element = document.createElement(CountingElement.tagName) as CountingElement
		document.body.append(element)
		element.remove()
		await settle()

		// Act
		document.body.append(element)
		element.remove()
		await settle()

		// Assert
		expect(element.mounts).toBe(1)
	})
})

describe('RootedElement, while pre-rendering', () => {
	test('mounts again right away on reconnecting', async () => {
		// Arrange
		const element = document.createElement(CountingElement.tagName) as CountingElement
		document.body.append(element)
		element.remove()
		await settle()

		// Act
		document.body.append(element)

		// Assert
		expect(element.mounts).toBe(2)
	})
})
