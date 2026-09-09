import { describe, expect, test } from 'vitest'

import { ComponentContext } from '@rooted/components'

import { createElementFactory } from '../../elements/src/element-factory.mts'
import { Link, LinkOptions } from '../src/navigation-link.mts'

/**
 * Mounts Link without registering a custom element. Only `options`, `append`
 * and `element` are used by onMount, so the rest of the context stays off.
 */
function mountLink(options: LinkOptions): HTMLAnchorElement {
	const controller = new AbortController()
	let anchor: HTMLAnchorElement | undefined

	Link.onMount({
		options,
		element: createElementFactory(document.createElement.bind(document), controller.signal),
		append(node: HTMLAnchorElement) {
			anchor = node
			return node
		},
	} as unknown as ComponentContext<LinkOptions>)

	if (!anchor) throw new Error('Link did not append an anchor')
	return anchor
}

describe('Link children', () => {
	test('appends a mixed array of strings and nodes in order', () => {
		// Arrange
		const trailingIcon = document.createElement('span')
		trailingIcon.textContent = '↗'

		// Act
		const anchor = mountLink({
			href: '/about/',
			children: ['About us', trailingIcon],
		})

		// Assert
		const [label, icon] = anchor.childNodes
		expect(anchor.childNodes).toHaveLength(2)
		expect(label.textContent).toBe('About us')
		expect(icon).toBe(trailingIcon)
	})

	test('skips undefined and null entries in a children array', () => {
		// Arrange
		const label = document.createElement('span')

		// Act
		const anchor = mountLink({
			href: '/about/',
			children: [undefined, label, null],
		})

		// Assert
		expect(anchor.childNodes).toHaveLength(1)
		expect(anchor.firstChild).toBe(label)
	})

	test('appends a single string child', () => {
		// Act
		const anchor = mountLink({
			href: '/about/',
			children: 'About us',
		})

		// Assert
		expect(anchor.textContent).toBe('About us')
	})
})
