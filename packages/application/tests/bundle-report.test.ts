// @vitest-environment node
import SondaVitePlugin from 'sonda/vite'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { bundleReport } from '../plugins/bundle-report.mts'

import type { Plugin } from 'vite'

// Still the real Sonda, the spy only records what it was given.
vi.mock('sonda/vite', async (importOriginal) => {
	const actual = await importOriginal<typeof import('sonda/vite')>()
	return { default: vi.fn(actual.default) }
})

type SondaOptions = NonNullable<Parameters<typeof SondaVitePlugin>[0]>

let argv: string[]

beforeEach(() => {
	argv = process.argv
})

afterEach(() => {
	process.argv = argv
	vi.mocked(SondaVitePlugin).mockClear()
})

function build(...flags: string[]) {
	process.argv = [...argv, ...flags]
	const plugin = bundleReport() as Plugin
	const options = vi.mocked(SondaVitePlugin).mock.calls[0]?.[0] as SondaOptions
	return { plugin, options }
}

describe('bundleReport()', () => {
	test('does nothing without --analyze', () => {
		// Act
		const { plugin } = build()

		// Assert
		expect(Object.keys(plugin)).toEqual(['name'])
	})

	test('hooks into the build with --analyze', () => {
		// Act
		const { plugin } = build('--analyze')

		// Assert
		expect(plugin.writeBundle).toBeTypeOf('function')
		expect(plugin.apply).toBe('build')
	})

	test('writes dist/stats.html and opens it', () => {
		// Act
		const { options } = build('--analyze')

		// Assert
		expect(options).toMatchObject({ format: 'html', filename: 'stats', outputDir: 'dist', open: true })
	})

	test('reports gzip and brotli sizes', () => {
		// Act
		const { options } = build('--analyze')

		// Assert
		expect(options).toMatchObject({ gzip: true, brotli: true })
	})

	test('leaves out the tagged css flavor, keeps the plain one', () => {
		// Arrange
		const { options } = build('--analyze')
		const files = ['assets/recipe.tagged.css', 'assets/recipe.tagged-B84dQdDs.css', 'assets/recipe-B84dQdDs.css']

		// Act
		const excluded = files.map(file => options.exclude?.some(pattern => pattern.test(file)) ?? false)

		// Assert
		expect(excluded).toEqual([true, true, false])
	})
})
