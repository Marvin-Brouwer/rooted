// @vitest-environment node
import { describe, expect, test } from 'vitest'

import { catchAllPrefixes, createCatchAllMatcher } from '../src/utility/catch-all.mts'

describe('catchAllPrefixes()', () => {
	test('cuts each pattern at its first parameter', () => {
		// Act
		const prefixes = catchAllPrefixes(['/recipe/:id/', '/user/:name/posts/'])

		// Assert
		expect(prefixes).toEqual(['/recipe/', '/user/'])
	})

	test('keeps one prefix for patterns that share it', () => {
		// Act
		const prefixes = catchAllPrefixes(['/recipe/:id/', '/recipe/:id/ingredients/', '/recipe/:id/:step/'])

		// Assert
		expect(prefixes).toEqual(['/recipe/'])
	})

	test('keeps the literal segments before the first parameter', () => {
		// Act
		const prefixes = catchAllPrefixes(['/shop/products/:id/'])

		// Assert
		expect(prefixes).toEqual(['/shop/products/'])
	})

	test('collapses to the root when a pattern starts with a parameter', () => {
		// Act
		const prefixes = catchAllPrefixes(['/recipe/:id/', '/:slug/'])

		// Assert
		expect(prefixes).toEqual(['/'])
	})

	test('ignores a pattern without a parameter', () => {
		// Act
		const prefixes = catchAllPrefixes(['/about/'])

		// Assert
		expect(prefixes).toEqual([])
	})
})

describe('createCatchAllMatcher()', () => {
	test('matches a dynamic route', () => {
		// Arrange
		const matches = createCatchAllMatcher({ staticPaths: [], dynamicPatterns: ['/recipe/:id/'] })

		// Act
		const matched = matches('/recipe/42/')

		// Assert
		expect(matched).toBe(true)
	})

	test('matches a path deeper than the route, the way the host does', () => {
		// Arrange
		const matches = createCatchAllMatcher({ staticPaths: [], dynamicPatterns: ['/recipe/:id/'] })

		// Act
		const matched = matches('/recipe/42/extra/')

		// Assert
		expect(matched).toBe(true)
	})

	test('does not match the bare prefix', () => {
		// Arrange
		const matches = createCatchAllMatcher({ staticPaths: [], dynamicPatterns: ['/recipe/:id/'] })

		// Act
		const matched = matches('/recipe/')

		// Assert -- there's nothing after it for the wildcard to catch
		expect(matched).toBe(false)
	})

	test('does not match a path that only shares the letters of a prefix', () => {
		// Arrange
		const matches = createCatchAllMatcher({ staticPaths: [], dynamicPatterns: ['/recipe/:id/'] })

		// Act
		const matched = matches('/recipes/42/')

		// Assert
		expect(matched).toBe(false)
	})

	test('matches static paths as written', () => {
		// Arrange
		const matches = createCatchAllMatcher({ staticPaths: ['/about'], dynamicPatterns: [] })

		// Act
		const matched = matches('/about/')

		// Assert
		expect(matched).toBe(true)
	})
})
