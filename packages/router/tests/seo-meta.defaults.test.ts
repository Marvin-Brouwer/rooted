import { afterEach, describe, expect, test, vi } from 'vitest'

import { readSeoDefaults } from '../src/seo-meta.defaults.mts'

describe('readSeoDefaults()', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	test('reads the values rootedManifest defines', () => {
		// Arrange
		vi.stubEnv('ROOTED_DEFAULT_TITLE', 'From index.html')
		vi.stubEnv('ROOTED_DEFAULT_DESCRIPTION', 'Described in index.html')

		// Act
		const result = readSeoDefaults()

		// Assert
		expect(result).toEqual({ title: 'From index.html', description: 'Described in index.html' })
	})

	test('is empty when nothing is defined', () => {
		// Act
		const result = readSeoDefaults()

		// Assert
		expect(result).toEqual({ title: '', description: '' })
	})
})
