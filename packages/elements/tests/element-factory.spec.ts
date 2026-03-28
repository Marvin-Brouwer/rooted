/**
 * Spec: createElementFactory — element creation
 *
 * Illustrates how createElement() builds DOM elements using the
 * tag, DOM properties, classes, aria, and children options.
 */
import { describe, expect, test } from 'vitest'

import { createElementFactory } from '../src/element-factory.mts'

const element = createElementFactory(document.createElement.bind(document))

describe('element creation', () => {
	test('creates element with the correct tag', () => {
		const div = element('div')
		expect(div.tagName.toLowerCase()).toBe('div')
	})

	test('sets writable DOM string properties', () => {
		const input = element('input', { type: 'search', placeholder: 'Search…' })
		expect(input.type).toBe('search')
		expect(input.placeholder).toBe('Search…')
	})

	test('sets boolean DOM property', () => {
		const input = element('input', { readOnly: true })
		expect(input.readOnly).toBe(true)
	})

	test('skips null property values', () => {
		const input = element('input', { placeholder: null as unknown as string })
		expect(input.placeholder).toBe('')
	})

	test('skips undefined property values', () => {
		const input = element('input', { placeholder: undefined })
		expect(input.placeholder).toBe('')
	})

	test('returns element of the correct type', () => {
		const button = element('button')
		expect(button).toBeInstanceOf(HTMLButtonElement)
	})
})

describe('classes option', () => {
	test('single string sets className', () => {
		const div = element('div', { classes: 'card' })
		expect(div.className).toBe('card')
	})

	test('array of strings joins them', () => {
		const div = element('div', { classes: ['card', 'active'] })
		expect(div.className).toBe('card active')
	})

	test('array filters falsy entries', () => {
		const div = element('div', { classes: ['card', '', false, null, 'active'] as string[] })
		expect(div.className).toBe('card active')
	})

	test('no classes option leaves className empty', () => {
		const div = element('div')
		expect(div.className).toBe('')
	})
})

describe('aria option', () => {
	test('sets ariaLabel via the aria prop', () => {
		const button = element('button', { aria: { label: 'Close dialog' } })
		expect(button.ariaLabel).toBe('Close dialog')
	})

	test('sets role attribute', () => {
		const div = element('div', { role: 'button' })
		expect(div.getAttribute('role')).toBe('button')
	})
})

describe('children option', () => {
	test('single Node child is appended', () => {
		const span = element('span', { textContent: 'inner' })
		const div = element('div', { children: span })
		expect(div.firstElementChild).toBe(span)
	})

	test('array of Nodes is appended in order', () => {
		const a = element('span', { textContent: 'a' })
		const b = element('span', { textContent: 'b' })
		const div = element('div', { children: [a, b] })
		expect(div.children[0]).toBe(a)
		expect(div.children[1]).toBe(b)
	})

	test('string child is appended as text', () => {
		const p = element('p', { children: 'Hello' })
		expect(p.textContent).toBe('Hello')
	})
})
