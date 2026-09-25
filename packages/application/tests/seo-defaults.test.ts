// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { readHtmlSeoDefaults, seoDefaultsPlugin } from '../plugins/seo-defaults.mts'

import type { UserConfig, ViteDevServer } from 'vite'

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

	test('ignores a data-name attribute', () => {
		// Arrange
		const html = '<meta data-name="description" content="wrong"><meta name="description" content="right">'

		// Act
		const result = readHtmlSeoDefaults(html)

		// Assert
		expect(result.description).toBe('right')
	})

	test('keeps a > inside a quoted value', () => {
		// Arrange
		const html = '<meta name="description" content="1 > 0 is true">'

		// Act
		const result = readHtmlSeoDefaults(html)

		// Assert
		expect(result.description).toBe('1 > 0 is true')
	})

	test('skips commented-out tags', () => {
		// Arrange
		const html = '<!-- <title>Old</title> --><title>Current</title>'

		// Act
		const result = readHtmlSeoDefaults(html)

		// Assert
		expect(result.title).toBe('Current')
	})

	test('only reads the head, not an svg title in the body', () => {
		// Arrange
		const html = '<head><title>Page</title></head><body><svg><title>Icon</title></svg></body>'

		// Act
		const result = readHtmlSeoDefaults(html)

		// Assert
		expect(result.title).toBe('Page')
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

	async function config(userConfig: UserConfig, plugin = seoDefaultsPlugin()) {
		const hook = plugin.config as (config: UserConfig) => Promise<UserConfig | undefined>
		return await hook(userConfig)
	}

	/** Loads the config, starts a stand-in dev server, and returns what an edit to a file would do. */
	async function devServer() {
		const plugin = seoDefaultsPlugin()
		await config({ root }, plugin)

		let onChange: (file: string) => Promise<void> = () => Promise.resolve()
		const restart = vi.fn(() => Promise.resolve())
		const server = {
			config: { root },
			restart,
			watcher: {
				add: vi.fn(),
				on: (_event: string, handler: typeof onChange) => { onChange = handler },
			},
		}
		const hook = plugin.configureServer as (server: ViteDevServer) => void
		hook(server as unknown as ViteDevServer)

		return { restart, change: (file: string) => onChange(file) }
	}

	function writeIndexHtml(html: string) {
		return writeFile(path.join(root, 'index.html'), html, 'utf8')
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

	test('restarts the dev server when the title changes', async () => {
		// Arrange
		await writeIndexHtml('<title>Before</title>')
		const server = await devServer()
		await writeIndexHtml('<title>After</title>')

		// Act
		await server.change(path.join(root, 'index.html'))

		// Assert
		expect(server.restart).toHaveBeenCalledOnce()
	})

	test('leaves the dev server alone when something else in index.html changes', async () => {
		// Arrange
		await writeIndexHtml('<title>Same</title>')
		const server = await devServer()
		await writeIndexHtml('<title>Same</title><link rel="icon" href="/icon.svg">')

		// Act
		await server.change(path.join(root, 'index.html'))

		// Assert
		expect(server.restart).not.toHaveBeenCalled()
	})

	test('ignores changes to other files', async () => {
		// Arrange
		await writeIndexHtml('<title>Before</title>')
		const server = await devServer()
		await writeIndexHtml('<title>After</title>')

		// Act
		await server.change(path.join(root, 'src', 'application.mts'))

		// Assert
		expect(server.restart).not.toHaveBeenCalled()
	})
})
