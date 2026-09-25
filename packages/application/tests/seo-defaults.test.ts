// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { readHtmlSeoDefaults, seoDefaultsPlugin } from '../plugins/seo-defaults.mts'

import type { UserConfig } from 'vite'

describe('readHtmlSeoDefaults()', () => {
	test('reads the title and the description', () => {
		// Arrange
		const html = '<head><title>My App</title><meta name="description" content="What it does"></head>'

		// Act
		const result = readHtmlSeoDefaults(html)

		// Assert
		expect(result).toEqual({ title: 'My App', description: 'What it does' })
	})

	test('finds the description whatever order the attributes are in', () => {
		// Arrange
		const html = `<meta content='Content first' name="description" />`

		// Act
		const result = readHtmlSeoDefaults(html)

		// Assert
		expect(result.description).toBe('Content first')
	})

	test('decodes entities', () => {
		// Arrange
		const html = '<title>Salt &amp; Pepper &#8211; &#x1F336;</title>'

		// Act
		const result = readHtmlSeoDefaults(html)

		// Assert
		expect(result.title).toBe('Salt & Pepper – 🌶')
	})

	test('leaves out what isn\'t there', () => {
		// Act
		const result = readHtmlSeoDefaults('<head><meta name="viewport" content="width=device-width"></head>')

		// Assert
		expect(result).toEqual({ title: undefined, description: undefined })
	})
})

describe('seoDefaultsPlugin()', () => {
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'rooted-seo-defaults-'))
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	async function config(userConfig: UserConfig) {
		const hook = seoDefaultsPlugin().config as (config: UserConfig) => Promise<UserConfig | undefined>
		return await hook(userConfig)
	}

	test('defines the index.html title and description', async () => {
		// Arrange
		await writeFile(path.join(root, 'index.html'), '<title>My App</title><meta name="description" content="What it does">', 'utf8')

		// Act
		const result = await config({ root })

		// Assert
		expect(result?.define).toEqual({
			'import.meta.env.ROOTED_DEFAULT_TITLE': '"My App"',
			'import.meta.env.ROOTED_DEFAULT_DESCRIPTION': '"What it does"',
		})
	})

	test('defines nothing when there is no index.html', async () => {
		// Act
		const result = await config({ root })

		// Assert
		expect(result).toBeUndefined()
	})
})
