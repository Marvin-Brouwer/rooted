import { describe, expect, test, vi } from 'vitest'

// Mock @rooted/components so component() simply returns the constructor,
// avoiding DOM dependencies (validateComponentName, appendSourceLocation)
vi.mock('@rooted/components', () => ({
	component: (c: object) => c,
	isComponent: () => false,
}))

import { gate, token } from '../src/gate-factory.mts'
import type { ComponentConstructor } from '@rooted/components'

function mockComponent(name: string): ComponentConstructor {
	return { name, onMount: () => {} }
}

describe('token', () => {
	test('returns an object with key and matches', () => {
		const t = token('id', Number)
		expect(t.key).toBe('id')
		expect(t.matches).toBe(Number)
	})

	test('works with all supported parameter types', () => {
		expect(token('n', Number).matches).toBe(Number)
		expect(token('s', String).matches).toBe(String)
		expect(token('b', Boolean).matches).toBe(Boolean)
		expect(token('d', Date).matches).toBe(Date)
	})
})

describe('gate — static path matching', () => {
	const routeGate = gate(mockComponent('products'))`/products`

	test('matchFrom returns match result for exact path', () => {
		const result = routeGate.matchFrom('/products')
		expect(result).not.toBe(false)
		expect((result as { end: number; params: object }).end).toBe('/products'.length)
		expect((result as { end: number; params: object }).params).toEqual({})
	})

	test('matchFrom matches path prefix', () => {
		expect(routeGate.matchFrom('/products/42')).not.toBe(false)
	})

	test('matchFrom returns false for non-matching path', () => {
		expect(routeGate.matchFrom('/other')).toBe(false)
	})

	test('matchFrom returns false for empty string', () => {
		expect(routeGate.matchFrom('')).toBe(false)
	})

	test('match returns params object for matching URL', () => {
		const result = routeGate.match(new URL('http://example.com/products'))
		expect(result).toEqual({})
	})

	test('match returns false for non-matching URL', () => {
		expect(routeGate.match(new URL('http://example.com/other'))).toBe(false)
	})
})

describe('gate — number parameter', () => {
	const idToken = token('id', Number)
	const routeGate = gate(mockComponent('product-detail'))`/products/${idToken}`

	test('extracts number parameter', () => {
		const result = routeGate.matchFrom('/products/42')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: 42 })
	})

	test('extracts zero', () => {
		const result = routeGate.matchFrom('/products/0')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: 0 })
	})

	test('extracts decimal number', () => {
		const result = routeGate.matchFrom('/products/3.14')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: 3.14 })
	})

	test('extracts negative number', () => {
		const result = routeGate.matchFrom('/products/-5')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: -5 })
	})

	test('returns false for non-numeric value', () => {
		expect(routeGate.matchFrom('/products/abc')).toBe(false)
	})

	test('returns false when parameter is missing', () => {
		expect(routeGate.matchFrom('/products/')).toBe(false)
	})

	test('returns false for empty segment from consecutive slashes', () => {
		// /products//42 — the segment between the two slashes is empty
		expect(routeGate.matchFrom('/products//42')).toBe(false)
	})

	test('match() returns params object directly', () => {
		const result = routeGate.match(new URL('http://example.com/products/7'))
		expect(result).toEqual({ id: 7 })
	})
})

describe('gate — string parameter', () => {
	const slugToken = token('slug', String)
	const routeGate = gate(mockComponent('category'))`/category/${slugToken}`

	test('extracts string parameter', () => {
		const result = routeGate.matchFrom('/category/electronics')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ slug: 'electronics' })
	})
})

describe('gate — boolean parameter', () => {
	const flagToken = token('flag', Boolean)
	const routeGate = gate(mockComponent('toggle'))`/toggle/${flagToken}`

	test('parses "true"', () => {
		expect((routeGate.matchFrom('/toggle/true') as { params: Record<string, unknown> })?.params).toEqual({ flag: true })
	})

	test('parses "false"', () => {
		expect((routeGate.matchFrom('/toggle/false') as { params: Record<string, unknown> })?.params).toEqual({ flag: false })
	})

	test('parses "1" as true', () => {
		expect((routeGate.matchFrom('/toggle/1') as { params: Record<string, unknown> })?.params).toEqual({ flag: true })
	})

	test('parses "0" as false', () => {
		expect((routeGate.matchFrom('/toggle/0') as { params: Record<string, unknown> })?.params).toEqual({ flag: false })
	})

	test('parses single-letter "t" as true', () => {
		expect((routeGate.matchFrom('/toggle/t') as { params: Record<string, unknown> })?.params).toEqual({ flag: true })
	})

	test('parses single-letter "f" as false', () => {
		expect((routeGate.matchFrom('/toggle/f') as { params: Record<string, unknown> })?.params).toEqual({ flag: false })
	})

	test('parses uppercase "T" as true (case-insensitive)', () => {
		expect((routeGate.matchFrom('/toggle/T') as { params: Record<string, unknown> })?.params).toEqual({ flag: true })
	})

	test('parses uppercase "F" as false (case-insensitive)', () => {
		expect((routeGate.matchFrom('/toggle/F') as { params: Record<string, unknown> })?.params).toEqual({ flag: false })
	})

	test('returns false for invalid boolean value', () => {
		expect(routeGate.matchFrom('/toggle/maybe')).toBe(false)
	})
})

describe('gate — date parameter', () => {
	const dateToken = token('date', Date)
	const routeGate = gate(mockComponent('events'))`/events/${dateToken}`

	test('extracts a valid date', () => {
		const result = routeGate.matchFrom('/events/2024-01-15')
		expect(result).not.toBe(false)
		const { date } = (result as { params: Record<string, unknown> }).params
		expect(date).toBeInstanceOf(Date)
		expect((date as Date).getFullYear()).toBe(2024)
	})

	test('returns false for invalid date', () => {
		expect(routeGate.matchFrom('/events/not-a-date')).toBe(false)
	})
})

describe('gate — multiple parameters', () => {
	const categoryToken = token('category', String)
	const idToken = token('id', Number)
	const routeGate = gate(mockComponent('item'))`/${categoryToken}/items/${idToken}`

	test('extracts both parameters', () => {
		const result = routeGate.matchFrom('/books/items/99')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ category: 'books', id: 99 })
	})
})

describe('gate — exact flag', () => {
	const comp = mockComponent('exact-route')

	test('exact is false for regular gate', () => {
		const routeGate = gate(comp)`/path`
		expect(routeGate.exact).toBe(false)
	})

	test('exact is true for gate.exact', () => {
		const exactGate = gate(comp).exact`/path`
		expect(exactGate.exact).toBe(true)
	})
})

describe('gate — hasChildren', () => {
	const parentComp = mockComponent('parent-gate')
	const childComp = mockComponent('child-gate')
	const parentGate = gate(parentComp)`/parent`

	test('hasChildren is false before any append', () => {
		expect(parentGate.hasChildren).toBe(false)
	})

	test('hasChildren is true after appending a child gate', () => {
		parentGate.append(childComp)`/child`
		expect(parentGate.hasChildren).toBe(true)
	})
})

describe('gate — matchFrom with explicit offset', () => {
	const routeGate = gate(mockComponent('offset-test'))`/products`

	test('matches at a non-zero offset into the path', () => {
		// '/prefix/products' — the gate pattern starts at index 7
		const result = routeGate.matchFrom('/prefix/products', 7)
		expect(result).not.toBe(false)
		expect((result as { end: number; params: object }).end).toBe(16)
	})

	test('returns false when offset is beyond the string length', () => {
		expect(routeGate.matchFrom('/products', 99)).toBe(false)
	})
})

describe('gate — nested routes via append', () => {
	const parentComp = mockComponent('nested-parent')
	const childComp = mockComponent('nested-child')
	const parentGate = gate(parentComp)`/api`
	const childGate = parentGate.append(childComp)`/users`

	test('nested gate matches combined path', () => {
		expect(childGate.matchFrom('/api/users')).not.toBe(false)
	})

	test('nested gate does not match parent path alone', () => {
		expect(childGate.matchFrom('/api')).toBe(false)
	})

	test('nested gate does not match child path without parent prefix', () => {
		expect(childGate.matchFrom('/users')).toBe(false)
	})

	test('nested gate merges params from parent and child', () => {
		// Parent pattern: /user/${id}/post — the non-empty "/post" suffix bounds the number param
		// Child pattern: /${name} — matches the remaining segment
		const idToken = token('id', Number)
		const nameToken = token('name', String)
		const pGate = gate(mockComponent('p'))`/user/${idToken}/post`
		const cGate = pGate.append(mockComponent('c'))`/${nameToken}`

		const result = cGate.matchFrom('/user/42/post/hello')
		expect(result).not.toBe(false)
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: 42, name: 'hello' })
	})
})
