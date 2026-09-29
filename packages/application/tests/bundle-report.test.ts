// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import SondaVitePlugin from 'sonda/vite'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { bundleReport, bundleReportOpenPluginName } from '../plugins/bundle-report.mts'

import type { Logger, Plugin, ResolvedConfig } from 'vite'

// Still the real Sonda, the spy only records what it was given.
vi.mock('sonda/vite', async (importOriginal) => {
	const actual = await importOriginal<typeof import('sonda/vite')>()
	return { default: vi.fn(actual.default) }
})

type SondaOptions = NonNullable<Parameters<typeof SondaVitePlugin>[0]>
type OpenHooks = Plugin & {
	configResolved: (config: ResolvedConfig) => void
	closeBundle: { handler: () => Promise<void> }
}

let argv: string[]

beforeEach(() => {
	argv = process.argv
	// The opener is left out in CI, and these tests run in CI too.
	vi.stubEnv('CI', '')
})

afterEach(() => {
	process.argv = argv
	vi.unstubAllEnvs()
	vi.mocked(SondaVitePlugin).mockClear()
})

function build(...flags: string[]) {
	process.argv = [...argv, ...flags]
	const plugins = bundleReport() as (Plugin | false)[]
	const options = vi.mocked(SondaVitePlugin).mock.calls[0]?.[0] as SondaOptions
	const opener = plugins.find(plugin => plugin && plugin.name === bundleReportOpenPluginName) as OpenHooks | undefined
	return { plugins, options, opener }
}

describe('bundleReport()', () => {
	test('does nothing without --analyze', () => {
		// Act
		const { plugins } = build()

		// Assert
		expect(plugins).toEqual([])
		expect(SondaVitePlugin).not.toHaveBeenCalled()
	})

	test('hooks Sonda into the build with --analyze', () => {
		// Act
		const { plugins } = build('--analyze')

		// Assert
		expect(plugins).toContainEqual(expect.objectContaining({ name: 'sonda/vite', apply: 'build' }))
	})

	test('writes dist/stats.html, leaving the opening to rooted', () => {
		// Act
		const { options } = build('--analyze')

		// Assert
		expect(options).toMatchObject({ format: 'html', filename: 'stats', outputDir: 'dist', open: false })
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

	test('opens the report after Sonda has written it', () => {
		// Act
		const { opener } = build('--analyze')

		// Assert
		expect(opener?.closeBundle).toMatchObject({ order: 'post', sequential: true })
	})

	test('doesn\'t try to open the report in CI', () => {
		// Arrange
		vi.stubEnv('CI', 'true')

		// Act
		const { opener } = build('--analyze')

		// Assert
		expect(opener).toBeUndefined()
	})

	describe('without a program to open the report with', () => {
		let emptyPath: string

		beforeEach(async () => {
			emptyPath = await mkdtemp(path.join(tmpdir(), 'rooted-bundle-report-'))
			vi.stubEnv('PATH', emptyPath)
		})

		afterEach(async () => {
			await rm(emptyPath, { recursive: true, force: true })
		})

		test('warns with where the report is instead of failing the build', async () => {
			// Arrange
			const { opener } = build('--analyze')
			const warn = vi.fn()
			opener!.configResolved({ logger: { warn } as unknown as Logger } as ResolvedConfig)

			// Act
			await opener!.closeBundle.handler()

			// Assert
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('isn\'t installed'))
			expect(warn).toHaveBeenCalledWith(expect.stringContaining(path.resolve('dist', 'stats.html')))
		})
	})
})
