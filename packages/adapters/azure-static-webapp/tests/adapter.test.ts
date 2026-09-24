// @vitest-environment node
import { describe, expect, test } from 'vitest'

import { azureStaticWebappAdapter } from '../src/adapter.mts'

import type { AzureStaticWebappAdapterOptions } from '../src/adapter.mts'

describe('azureStaticWebappAdapter()', () => {
	test('refuses to guess when dynamicRoutes is left out', () => {
		// Arrange -- what plain JS config can still pass
		const options = {} as AzureStaticWebappAdapterOptions

		// Act
		const create = () => azureStaticWebappAdapter(options)

		// Assert
		expect(create).toThrow(/dynamicRoutes is required/)
	})

	test('refuses a value it does not know', () => {
		// Arrange
		const options = { dynamicRoutes: 'routed' } as unknown as AzureStaticWebappAdapterOptions

		// Act
		const create = () => azureStaticWebappAdapter(options)

		// Assert
		expect(create).toThrow(/'not-found' or 'catch-all'/)
	})

	test.each(['not-found', 'catch-all'] as const)('accepts %s', dynamicRoutes => {
		// Act
		const plugins = azureStaticWebappAdapter({ dynamicRoutes })

		// Assert
		expect(plugins.length).toBeGreaterThan(0)
	})
})
