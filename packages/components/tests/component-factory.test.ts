import { describe, expect, test } from 'vitest'

import { optional } from '../src/_module/elements.mts'
import { create } from '../src/component-factory.mts'
import { RootedElement } from '../src/rooted-element.mts'

class ChildrenElement extends RootedElement {
	static tagName = 'children-element'
}

// The typed overload of create() only exposes the element's own properties, so
// passing children needs a cast. The runtime path is the one under test here.
function createWithChildren(children: Array<Node | string | undefined | null>) {
	return create(ChildrenElement, { children } as never)
}

describe('create children', () => {
	test('appends every node of the array', () => {
		// Arrange
		const first = document.createElement('span')
		const second = document.createElement('span')

		// Act
		const element = createWithChildren([first, second])

		// Assert
		expect([...element.childNodes]).toEqual([first, second])
	})

	test('skips null entries', () => {
		// Arrange
		const span = document.createElement('span')

		// Act
		const element = createWithChildren([span, null])

		// Assert
		expect(element.childNodes.length).toBe(1)
		expect(element.textContent).toBe('')
	})

	test('skips undefined entries', () => {
		// Arrange
		const span = document.createElement('span')

		// Act
		const element = createWithChildren([span, undefined])

		// Assert
		expect(element.childNodes.length).toBe(1)
		expect(element.textContent).toBe('')
	})

	test('skips children dropped by optional()', () => {
		// Arrange
		const span = document.createElement('span')

		// Act
		const element = createWithChildren([span, optional(false, 'checked')])

		// Assert
		expect(element.childNodes.length).toBe(1)
		expect(element.textContent).toBe('')
	})
})
