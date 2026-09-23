import { describe, test, expect, vi } from 'vitest'

vi.mock('@rooted/components/elements', () => ({
	createComponent: vi.fn(),
}))

vi.mock('../src/dev-helper.mts', () => ({ devHelper: {} }))

import { path } from '../src/href.mts'
import { route } from '../src/route.mts'
import { wildcard } from '../src/route.tokens.mts'
import { matchRoute } from '../src/router.match.mts'

const mockElement = { tagName: 'MOCK' } as unknown as Element

const resolves = () => Promise.resolve(mockElement)
const suppresses = () => Promise.resolve(void 0)
function throws(error: unknown) {
	return () => Promise.reject(error)
}

describe('matchRoute — selection', () => {
	test('single matching route is selected', async () => {
		// Arrange
		const categories = route`/categories/`({ resolve: resolves })

		// Act
		const result = await matchRoute(path('/categories/'), [categories])

		// Assert
		expect(result?.route).toBe(categories)
	})

	test('no match returns undefined', async () => {
		// Arrange
		const categories = route`/categories/`({ resolve: resolves })

		// Act
		const result = await matchRoute(path('/other/'), [categories])

		// Assert
		expect(result).toBeUndefined()
	})

	test('longer match wins over shorter match', async () => {
		// Arrange
		const short = route`/categories/`({ resolve: resolves })
		const long = route`/categories/italian/`({ resolve: resolves })

		// Act
		const result = await matchRoute(path('/categories/italian/'), [short, long])

		// Assert
		expect(result?.route).toBe(long)
	})

	test('non-wildcard beats wildcard of equal match length', async () => {
		// Arrange
		const specific = route`/search/hello/`({ resolve: resolves })
		const wild = route`/search/${wildcard()}/`({ resolve: resolves })

		// Act
		const result = await matchRoute(path('/search/hello/'), [wild, specific])

		// Assert
		expect(result?.route).toBe(specific)
	})

	test('suppressed route (resolve returns undefined) prevents shorter fallback', async () => {
		// Arrange
		const suppressed = route`/categories/italian/`({ resolve: suppresses })
		const fallback = route`/categories/`({ resolve: resolves })

		// Act
		const result = await matchRoute(path('/categories/italian/'), [suppressed, fallback])

		// Assert
		expect(result).toBeUndefined()
	})

	test('suppression only blocks when suppressed length > best match length', async () => {
		// Arrange
		const suppressed = route`/other/`({ resolve: suppresses })
		const categories = route`/categories/`({ resolve: resolves })

		// Act
		const result = await matchRoute(path('/categories/'), [suppressed, categories])

		// Assert
		expect(result?.route).toBe(categories)
	})
})

describe('matchRoute — a throwing resolve', () => {
	test('the only matching route throws → error with that route and error', async () => {
		// Arrange
		const error = new Error('boom')
		const broken = route`/broken/`({ resolve: throws(error) })

		// Act
		const result = await matchRoute(path('/broken/'), [broken])

		// Assert
		expect(result).toMatchObject({ kind: 'error', route: broken, error })
	})

	test('a more specific route that throws is not hidden by a wildcard fallback', async () => {
		// Arrange
		const broken = route`/broken/`({ resolve: throws(new Error('boom')) })
		const fallback = route`/${wildcard()}/`({ resolve: resolves })

		// Act
		const result = await matchRoute(path('/broken/'), [fallback, broken])

		// Assert
		expect(result).toMatchObject({ kind: 'error', route: broken })
	})

	test('a broader route that throws loses to a more specific route that resolves', async () => {
		// Arrange
		const broken = route`/categories/`({ resolve: throws(new Error('boom')) })
		const italian = route`/categories/italian/`({ resolve: resolves })

		// Act
		const result = await matchRoute(path('/categories/italian/'), [broken, italian])

		// Assert
		expect(result).toMatchObject({ kind: 'match', route: italian })
	})

	test('a longer suppressing route also suppresses a shorter route that throws', async () => {
		// Arrange
		const suppressed = route`/categories/italian/`({ resolve: suppresses })
		const broken = route`/categories/`({ resolve: throws(new Error('boom')) })

		// Act
		const result = await matchRoute(path('/categories/italian/'), [suppressed, broken])

		// Assert
		expect(result).toBeUndefined()
	})

	test('a thrown non-Error value is wrapped in an Error', async () => {
		// Arrange
		const broken = route`/broken/`({ resolve: throws('boom') })

		// Act
		const result = await matchRoute(path('/broken/'), [broken])

		// Assert
		expect(result?.kind === 'error' && result.error).toEqual(new Error('boom'))
	})
})
