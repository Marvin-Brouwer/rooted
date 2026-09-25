import { afterEach, describe, expect, test, vi } from 'vitest'

import { readSeoDefaults } from '../src/seo-meta.defaults.mts'

describe('readSeoDefaults()', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		document.title = ''
		document.head.querySelector('meta[name="description"]')?.remove()
	})

	test('prefers the values rootedManifest defines', () => {
		// Arrange
		vi.stubEnv('ROOTED_DEFAULT_TITLE', 'From index.html')
		vi.stubEnv('ROOTED_DEFAULT_DESCRIPTION', 'Described in index.html')
		document.title = 'A pre-rendered route'

		// Act
		const result = readSeoDefaults()

		// Assert
		expect(result).toEqual({ title: 'From index.html', description: 'Described in index.html' })
	})

	test('treats an empty defined value as missing', () => {
		// Arrange
		vi.stubEnv('ROOTED_DEFAULT_TITLE', 'From index.html')
		vi.stubEnv('ROOTED_DEFAULT_DESCRIPTION', '')

		// Act
		const result = readSeoDefaults()

		// Assert
		expect(result.description).toBeUndefined()
	})

	test('reads the document when nothing is defined', () => {
		// Arrange
		document.title = 'Document title'
		const description = document.createElement('meta')
		description.name = 'description'
		description.content = 'Document description'
		document.head.append(description)

		// Act
		const result = readSeoDefaults()

		// Assert
		expect(result).toEqual({ title: 'Document title', description: 'Document description' })
	})
})
