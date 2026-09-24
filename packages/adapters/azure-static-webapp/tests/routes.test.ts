// @vitest-environment node
import { describe, expect, test } from 'vitest'

import { buildAzureRoutes } from '../src/adapter/routes.mts'

describe('buildAzureRoutes()', () => {
	test('writes nothing when there are no dynamic routes', () => {
		// Arrange
		const routes = { staticPaths: ['/about/'], dynamicPatterns: [] }

		// Act
		const azureRoutes = buildAzureRoutes(routes, ['index.html', 'about/index.html'], '404.html')

		// Assert
		expect(azureRoutes).toEqual([])
	})

	test('rewrites everything under a dynamic route\'s prefix to the fallback', () => {
		// Arrange
		const routes = { staticPaths: [], dynamicPatterns: ['/recipe/:id/', '/category/:slug/'] }

		// Act
		const azureRoutes = buildAzureRoutes(routes, [], '404.html')

		// Assert
		expect(azureRoutes).toEqual([
			{ route: '/recipe/*', rewrite: '/404.html' },
			{ route: '/category/*', rewrite: '/404.html' },
		])
	})

	test('lets files under a prefix through ahead of the wildcard', () => {
		// Arrange
		const routes = { staticPaths: [], dynamicPatterns: ['/recipe/:id/'] }

		// Act
		const azureRoutes = buildAzureRoutes(routes, ['recipe/photo.jpg'], '404.html')

		// Assert -- rules are first-match, so the file rule has to come first
		expect(azureRoutes).toEqual([
			{ route: '/recipe/photo.jpg' },
			{ route: '/recipe/*', rewrite: '/404.html' },
		])
	})

	test('lets pre-rendered pages under a prefix through as their index.html', () => {
		// Arrange
		const routes = { staticPaths: ['/recipe/new/', '/recipe/random'], dynamicPatterns: ['/recipe/:id/'] }

		// Act
		const azureRoutes = buildAzureRoutes(routes, [], '404.html')

		// Assert
		expect(azureRoutes).toEqual([
			{ route: '/recipe/new/index.html' },
			{ route: '/recipe/random/index.html' },
			{ route: '/recipe/*', rewrite: '/404.html' },
		])
	})

	test('lists a pre-rendered page once when it is also in the output files', () => {
		// Arrange
		const routes = { staticPaths: ['/recipe/new/'], dynamicPatterns: ['/recipe/:id/'] }

		// Act
		const azureRoutes = buildAzureRoutes(routes, ['recipe/new/index.html'], '404.html')

		// Assert
		expect(azureRoutes).toEqual([
			{ route: '/recipe/new/index.html' },
			{ route: '/recipe/*', rewrite: '/404.html' },
		])
	})

	test('leaves files outside every prefix alone', () => {
		// Arrange
		const routes = { staticPaths: ['/about/'], dynamicPatterns: ['/recipe/:id/'] }

		// Act
		const azureRoutes = buildAzureRoutes(routes, ['assets/index.js', 'recipes.jpg'], '404.html')

		// Assert -- /recipes.jpg shares the letters but not the /recipe/ segment
		expect(azureRoutes).toEqual([{ route: '/recipe/*', rewrite: '/404.html' }])
	})

	test('leaves out the config file itself', () => {
		// Arrange
		const routes = { staticPaths: [], dynamicPatterns: ['/:slug/'] }

		// Act
		const azureRoutes = buildAzureRoutes(routes, ['staticwebapp.config.json', '404.html'], '404.html')

		// Assert
		expect(azureRoutes).toEqual([
			{ route: '/404.html' },
			{ route: '/*', rewrite: '/404.html' },
		])
	})
})
