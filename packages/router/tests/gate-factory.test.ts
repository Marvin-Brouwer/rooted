import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// Mock @rooted/components so component() simply returns the constructor,
// avoiding DOM dependencies (validateComponentName, appendSourceLocation)
vi.mock('@rooted/components', () => ({
	component: (c: object) => c,
	isComponent: () => false,
}))

import { route, gate, token, wildcard, typedParameter } from '../src/gate-factory.mts'
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

describe('route — static path matching', () => {
	const testRoute = route`/products/`(mockComponent('products'))

	test('matchFrom returns match result for exact path', () => {
		const result = testRoute.matchFrom('/products/')
		expect(result).not.toBe(false)
		expect((result as { end: number; params: object }).end).toBe('/products/'.length)
		expect((result as { end: number; params: object }).params).toEqual({})
	})

	test('matchFrom matches path prefix', () => {
		expect(testRoute.matchFrom('/products/42')).not.toBe(false)
	})

	test('matchFrom returns false for non-matching path', () => {
		expect(testRoute.matchFrom('/other')).toBe(false)
	})

	test('matchFrom returns false for empty string', () => {
		expect(testRoute.matchFrom('')).toBe(false)
	})

	test('match returns params object for matching URL', () => {
		const result = testRoute.match(new URL('http://example.com/products/'))
		expect(result).toEqual({})
	})

	test('match returns false for non-matching URL', () => {
		expect(testRoute.match(new URL('http://example.com/other'))).toBe(false)
	})

	test('route has a component property', () => {
		expect(testRoute.component).toBeDefined()
		expect(testRoute.component.name).toBe('products')
	})
})

describe('route — number parameter', () => {
	const idToken = token('id', Number)
	const testRoute = route`/products/${idToken}/`(mockComponent('product-detail'))

	test('extracts number parameter', () => {
		const result = testRoute.matchFrom('/products/42/')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: 42 })
	})

	test('extracts zero', () => {
		const result = testRoute.matchFrom('/products/0/')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: 0 })
	})

	test('extracts decimal number', () => {
		const result = testRoute.matchFrom('/products/3.14/')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: 3.14 })
	})

	test('extracts negative number', () => {
		const result = testRoute.matchFrom('/products/-5/')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: -5 })
	})

	test('returns false for non-numeric value', () => {
		expect(testRoute.matchFrom('/products/abc/')).toBe(false)
	})

	test('returns false when parameter is missing', () => {
		expect(testRoute.matchFrom('/products//')).toBe(false)
	})

	test('match() returns params object directly', () => {
		const result = testRoute.match(new URL('http://example.com/products/7/'))
		expect(result).toEqual({ id: 7 })
	})
})

describe('route — string parameter', () => {
	const slugToken = token('slug', String)
	const testRoute = route`/category/${slugToken}/`(mockComponent('category'))

	test('extracts string parameter', () => {
		const result = testRoute.matchFrom('/category/electronics/')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ slug: 'electronics' })
	})
})

describe('route — boolean parameter', () => {
	const flagToken = token('flag', Boolean)
	const testRoute = route`/toggle/${flagToken}/`(mockComponent('toggle'))

	test('parses "true"', () => {
		expect((testRoute.matchFrom('/toggle/true/') as { params: Record<string, unknown> })?.params).toEqual({ flag: true })
	})

	test('parses "false"', () => {
		expect((testRoute.matchFrom('/toggle/false/') as { params: Record<string, unknown> })?.params).toEqual({ flag: false })
	})

	test('parses "1" as true', () => {
		expect((testRoute.matchFrom('/toggle/1/') as { params: Record<string, unknown> })?.params).toEqual({ flag: true })
	})

	test('parses "0" as false', () => {
		expect((testRoute.matchFrom('/toggle/0/') as { params: Record<string, unknown> })?.params).toEqual({ flag: false })
	})

	test('parses single-letter "t" as true', () => {
		expect((testRoute.matchFrom('/toggle/t/') as { params: Record<string, unknown> })?.params).toEqual({ flag: true })
	})

	test('parses single-letter "f" as false', () => {
		expect((testRoute.matchFrom('/toggle/f/') as { params: Record<string, unknown> })?.params).toEqual({ flag: false })
	})

	test('parses uppercase "T" as true (case-insensitive)', () => {
		expect((testRoute.matchFrom('/toggle/T/') as { params: Record<string, unknown> })?.params).toEqual({ flag: true })
	})

	test('parses uppercase "F" as false (case-insensitive)', () => {
		expect((testRoute.matchFrom('/toggle/F/') as { params: Record<string, unknown> })?.params).toEqual({ flag: false })
	})

	test('returns false for invalid boolean value', () => {
		expect(testRoute.matchFrom('/toggle/maybe/')).toBe(false)
	})
})

describe('route — date parameter', () => {
	const dateToken = token('date', Date)
	const testRoute = route`/events/${dateToken}/`(mockComponent('events'))

	test('extracts a valid date', () => {
		const result = testRoute.matchFrom('/events/2024-01-15/')
		expect(result).not.toBe(false)
		const { date } = (result as { params: Record<string, unknown> }).params
		expect(date).toBeInstanceOf(Date)
		expect((date as Date).getFullYear()).toBe(2024)
	})

	test('returns false for invalid date', () => {
		expect(testRoute.matchFrom('/events/not-a-date/')).toBe(false)
	})
})

describe('route — multiple parameters', () => {
	const categoryToken = token('category', String)
	const idToken = token('id', Number)
	const testRoute = route`/${categoryToken}/items/${idToken}/`(mockComponent('item'))

	test('extracts both parameters', () => {
		const result = testRoute.matchFrom('/books/items/99/')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ category: 'books', id: 99 })
	})
})

describe('route — matchFrom with explicit offset', () => {
	const testRoute = route`/products/`(mockComponent('offset-test'))

	test('matches at a non-zero offset into the path', () => {
		// '/prefix/products/' — the route pattern starts at index 7
		const result = testRoute.matchFrom('/prefix/products/', 7)
		expect(result).not.toBe(false)
		expect((result as { end: number; params: object }).end).toBe(17)
	})

	test('returns false when offset is beyond the string length', () => {
		expect(testRoute.matchFrom('/products/', 99)).toBe(false)
	})
})

describe('route — nested routes via parent interpolation', () => {
	const parentComp = mockComponent('nested-parent')
	const childComp = mockComponent('nested-child')
	const parentRoute = route`/api/`(parentComp)
	const childRoute = route`${parentRoute}/users/`(childComp)

	test('nested route matches combined path', () => {
		expect(childRoute.matchFrom('/api/users/')).not.toBe(false)
	})

	test('nested route does not match parent path alone', () => {
		expect(childRoute.matchFrom('/api/')).toBe(false)
	})

	test('nested route does not match child path without parent prefix', () => {
		expect(childRoute.matchFrom('/users/')).toBe(false)
	})

	test('nested route merges params from parent and child', () => {
		// Parent pattern: /user/${id}/ — child pattern: /${name}/
		const idToken = token('id', Number)
		const nameToken = token('name', String)
		const pRoute = route`/user/${idToken}/`(mockComponent('p'))
		const cRoute = route`${pRoute}/post/${nameToken}/`(mockComponent('c'))

		const result = cRoute.matchFrom('/user/42/post/hello/')
		expect(result).not.toBe(false)
		expect((result as { params: Record<string, unknown> }).params).toEqual({ id: 42, name: 'hello' })
	})
})

describe('route — wildcard matching', () => {
	const testRoute = route`/archive/${wildcard('path')}/`(mockComponent('archive'))

	test('matches a single segment after the prefix', () => {
		expect(testRoute.matchFrom('/archive/foo/')).not.toBe(false)
	})

	test('matches multiple segments after the prefix', () => {
		expect(testRoute.matchFrom('/archive/foo/bar/baz')).not.toBe(false)
	})

	test('end position is the full path length', () => {
		const result = testRoute.matchFrom('/archive/foo/bar/')
		expect(result).not.toBe(false)
		expect((result as { end: number }).end).toBe('/archive/foo/bar/'.length)
	})

	test('stores the matched path segments under the given key', () => {
		const result = testRoute.matchFrom('/archive/foo/bar/')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ path: 'foo/bar/' })
	})

	test('single segment value is just the segment string', () => {
		const result = testRoute.matchFrom('/archive/foo/')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ path: 'foo/' })
	})

	test('returns false when nothing follows the prefix', () => {
		expect(testRoute.matchFrom('/archive/')).toBe(false)
	})

	test('returns false for non-matching prefix', () => {
		expect(testRoute.matchFrom('/other/foo/')).toBe(false)
	})

	test('defaults key to "path" when called with no arguments', () => {
		const defaultRoute = route`/files/${wildcard()}/`(mockComponent('files'))
		const result = defaultRoute.matchFrom('/files/a/b/')
		expect((result as { params: Record<string, unknown> }).params).toEqual({ path: 'a/b/' })
	})
})

describe('route — filter', () => {
	const allowed = new Set(['apple', 'banana'])
	const filteredRoute = route`/fruit/${token('name', String)}/`(
		mockComponent('fruit'),
		({ name }) => allowed.has(name),
	)

	test('matchFrom passes when filter returns true', () => {
		expect(filteredRoute.matchFrom('/fruit/apple/')).not.toBe(false)
	})

	test('matchFrom returns false when filter rejects', () => {
		expect(filteredRoute.matchFrom('/fruit/mango/')).toBe(false)
	})

	test('patternMatchFrom matches regardless of filter', () => {
		expect(filteredRoute.patternMatchFrom('/fruit/mango/')).not.toBe(false)
	})

	test('patternMatchFrom returns false when pattern itself does not match', () => {
		expect(filteredRoute.patternMatchFrom('/other/')).toBe(false)
	})

	test('routes without a filter have patternMatchFrom === matchFrom result', () => {
		const plain = route`/plain/`(mockComponent('plain'))
		const path = '/plain/'
		expect(plain.patternMatchFrom(path)).toEqual(plain.matchFrom(path))
	})
})

describe('gate — plain function', () => {
	test('returns an object with typedParameter from the route', () => {
		const idToken = token('id', Number)
		const testRoute = route`/articles/${idToken}/`(mockComponent('article'))
		const testGate = gate(testRoute, mockComponent('article-gate'))
		expect(testGate[typedParameter]).toBe(testRoute[typedParameter])
	})

	test('copies matchFrom from the route', () => {
		const testRoute = route`/articles/`(mockComponent('article'))
		const testGate = gate(testRoute, mockComponent('article-gate'))
		expect(testGate.matchFrom('/articles/')).not.toBe(false)
		expect(testGate.matchFrom('/other/')).toBe(false)
	})

	test('copies match from the route', () => {
		const testRoute = route`/articles/`(mockComponent('article'))
		const testGate = gate(testRoute, mockComponent('article-gate'))
		expect(testGate.match(new URL('http://example.com/articles/'))).toEqual({})
		expect(testGate.match(new URL('http://example.com/other/'))).toBe(false)
	})

	test('gate is a component (has onMount)', () => {
		const testRoute = route`/articles/`(mockComponent('article'))
		const testGate = gate(testRoute, mockComponent('article-gate'))
		expect(typeof testGate.onMount).toBe('function')
	})
})

describe('validatePattern — dev-mode errors', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})
	afterEach(() => {
		vi.restoreAllMocks()
	})

	test('emits error when pattern does not start with slash', () => {
		route`no-leading-slash/`(mockComponent('bad'))
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('must start with a slash'))
	})

	test('emits error when pattern does not end with slash', () => {
		route`/no-trailing-slash`(mockComponent('bad'))
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('must end with a slash'))
	})

	test('emits error when route interpolation has preceding text', () => {
		const parent = route`/parent/`(mockComponent('parent'))
		route`/prefix/${parent}/suffix/` as any
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('no preceding text'))
	})

	test('emits error when wildcard is not at the end', () => {
		// TypeScript would catch this, but we test the runtime check
		route`/before/${wildcard('seg') as any}/${token('id', Number)}/`(mockComponent('bad'))
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Wildcard interpolation must be at the end'))
	})

	test('emits error when wildcard is not preceded by a slash', () => {
		route`/noslash${wildcard('seg') as any}/` as any
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('must be preceded by a slash'))
	})

	test('no errors for a valid route pattern', () => {
		route`/articles/${token('id', Number)}/`(mockComponent('ok'))
		expect(console.error).not.toHaveBeenCalled()
	})

	test('no errors for a valid child route pattern', () => {
		const parent = route`/parent/`(mockComponent('parent'))
		route`${parent}/child/`(mockComponent('child'))
		expect(console.error).not.toHaveBeenCalled()
	})

	test('no errors for a valid wildcard route pattern', () => {
		route`/archive/${wildcard('path')}/`(mockComponent('archive'))
		expect(console.error).not.toHaveBeenCalled()
	})
})
