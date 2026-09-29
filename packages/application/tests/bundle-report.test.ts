// @vitest-environment node
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import SondaVitePlugin from 'sonda/vite'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { bundleReport } from '../plugins/bundle-report.mts'
import { bundleReportUrlPluginName } from '../plugins/bundle-report/print-url.mts'
import { bundleReportSourcemapsPluginName } from '../plugins/bundle-report/sourcemaps.mts'

import type { Plugin, ResolvedConfig, UserConfig } from 'vite'

// Still the real Sonda, the spy only records what it was given.
vi.mock('sonda/vite', async (importOriginal) => {
	const actual = await importOriginal<typeof import('sonda/vite')>()
	return { default: vi.fn(actual.default) }
})

type SondaOptions = NonNullable<Parameters<typeof SondaVitePlugin>[0]>
type UrlHooks = Plugin & {
	configResolved: (config: ResolvedConfig) => void
	closeBundle: { order: string, sequential: boolean, handler: () => void }
}
type SourcemapHooks = Plugin & {
	config: (config: UserConfig) => UserConfig | undefined
	writeBundle: (options: { dir?: string }, bundle: Record<string, object>) => void
	closeBundle: { order: string, sequential: boolean, handler: () => Promise<void> }
}

let argv: string[]

beforeEach(() => {
	argv = process.argv
	// The URL is left out in CI, and these tests run in CI too.
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
	const urlPlugin = plugins.find(plugin => plugin && plugin.name === bundleReportUrlPluginName) as UrlHooks | undefined
	const sourcemapsPlugin = plugins.find(plugin => plugin && plugin.name === bundleReportSourcemapsPluginName) as SourcemapHooks | undefined
	return { plugins, options, urlPlugin, sourcemapsPlugin }
}

/** Runs the URL plugin against a resolved config with Vite's preview defaults, and returns what it logged. */
function printedUrl(overrides: { base?: string, preview?: Partial<ResolvedConfig['preview']> } = {}) {
	const { urlPlugin } = build('--report-bundle')
	const info = vi.fn()
	urlPlugin!.configResolved({
		base: overrides.base ?? '/',
		preview: { port: 4173, ...overrides.preview },
		logger: { info },
	} as unknown as ResolvedConfig)

	urlPlugin!.closeBundle.handler()

	return info.mock.calls[0]?.[0] as string
}

describe('bundleReport()', () => {
	test('does nothing without --report-bundle', () => {
		// Act
		const { plugins } = build()

		// Assert
		expect(plugins).toEqual([])
		expect(SondaVitePlugin).not.toHaveBeenCalled()
	})

	test('doesn\'t answer to the old --analyze flag', () => {
		// Act
		const { plugins } = build('--analyze')

		// Assert
		expect(plugins).toEqual([])
	})

	test('hooks Sonda into the build with --report-bundle', () => {
		// Act
		const { plugins } = build('--report-bundle')

		// Assert
		expect(plugins).toContainEqual(expect.objectContaining({ name: 'sonda/vite', apply: 'build' }))
	})

	test('writes dist/bundle.html and never opens it', () => {
		// Act
		const { options } = build('--report-bundle')

		// Assert
		expect(options).toMatchObject({ format: 'html', filename: 'bundle', outputDir: 'dist', open: false })
	})

	test('reports gzip and brotli sizes', () => {
		// Act
		const { options } = build('--report-bundle')

		// Assert
		expect(options).toMatchObject({ gzip: true, brotli: true })
	})

	test('hands the css files to Sonda as chunks, so they make it into the report', () => {
		// Arrange
		const sondaWriteBundle = vi.fn()
		vi.mocked(SondaVitePlugin).mockReturnValueOnce({ name: 'sonda/vite', writeBundle: sondaWriteBundle })
		const { plugins } = build('--report-bundle')
		const sonda = plugins.find(plugin => plugin && plugin.name === 'sonda/vite') as Plugin & {
			writeBundle: (options: { dir: string }, bundle: Record<string, { type: string }>) => void
		}
		const script = { type: 'chunk', facadeModuleId: '/src/index.mts' }

		// Act
		sonda.writeBundle({ dir: 'dist' }, {
			'index.js': script,
			'recipe.css': { type: 'asset' },
			'photo.webp': { type: 'asset' },
		})

		// Assert
		expect(sondaWriteBundle).toHaveBeenCalledWith({ dir: 'dist' }, {
			'index.js': script,
			'recipe.css': { type: 'chunk', facadeModuleId: null },
			'photo.webp': { type: 'asset' },
		})
	})

	describe('sourcemaps', () => {
		let outputDirectory: string

		beforeEach(async () => {
			outputDirectory = await mkdtemp(path.join(tmpdir(), 'rooted-bundle-report-'))
			await writeFile(path.join(outputDirectory, 'index.js'), 'export {}\n')
			await writeFile(path.join(outputDirectory, 'index.js.map'), '{}')
		})

		afterEach(async () => {
			await rm(outputDirectory, { recursive: true, force: true })
		})

		/** Runs the sourcemaps plugin through a build that wrote `index.js` and `index.js.map` to `outputDirectory`. */
		async function buildWith(sourcemap: boolean) {
			const { sourcemapsPlugin } = build('--report-bundle')
			const config = sourcemapsPlugin!.config({ build: { sourcemap } })
			sourcemapsPlugin!.writeBundle({ dir: outputDirectory }, { 'index.js': {}, 'index.js.map': {} })
			await sourcemapsPlugin!.closeBundle.handler()
			return { config, left: await readdir(outputDirectory) }
		}

		test('turns on hidden maps for the report when the build has none', async () => {
			// Act
			const { config } = await buildWith(false)

			// Assert
			expect(config).toEqual({ build: { sourcemap: 'hidden' } })
		})

		test('removes the maps it caused once the report is written', async () => {
			// Act
			const { left } = await buildWith(false)

			// Assert
			expect(left).toEqual(['index.js'])
		})

		test('leaves maps the app asked for alone', async () => {
			// Act
			const { config, left } = await buildWith(true)

			// Assert
			expect(config).toBeUndefined()
			expect(left.toSorted()).toEqual(['index.js', 'index.js.map'])
		})

		test('removes them after Sonda has read them', () => {
			// Act
			const { sourcemapsPlugin } = build('--report-bundle')

			// Assert
			expect(sourcemapsPlugin?.closeBundle).toMatchObject({ order: 'post', sequential: true })
		})
	})

	describe('the printed URL', () => {
		test('points at vite preview\'s default address', () => {
			// Act
			const message = printedUrl()

			// Assert
			expect(message).toContain('http://localhost:4173/bundle.html')
		})

		test('includes the base path', () => {
			// Act
			const message = printedUrl({ base: '/rooted/' })

			// Assert
			expect(message).toContain('http://localhost:4173/rooted/bundle.html')
		})

		test('follows the preview\'s https, host and port', () => {
			// Act
			const message = printedUrl({ preview: { https: {}, host: 'my-host', port: 5000 } })

			// Assert
			expect(message).toContain('https://my-host:5000/bundle.html')
		})

		test('uses localhost when preview listens on every address', () => {
			// Act
			const messages = [true, '0.0.0.0', '::'].map(host => printedUrl({ preview: { host } }))

			// Assert
			expect(messages).toEqual(messages.map(() => expect.stringContaining('http://localhost:4173/bundle.html')))
		})

		test('is printed after Sonda has written the report', () => {
			// Act
			const { urlPlugin } = build('--report-bundle')

			// Assert
			expect(urlPlugin?.closeBundle).toMatchObject({ order: 'post', sequential: true })
		})

		test('isn\'t printed in CI', () => {
			// Arrange
			vi.stubEnv('CI', 'true')

			// Act
			const { urlPlugin } = build('--report-bundle')

			// Assert
			expect(urlPlugin).toBeUndefined()
		})
	})
})
