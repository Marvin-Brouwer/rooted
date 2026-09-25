import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, test, expect, vi } from 'vitest'

import { localizationDictionaryCheck } from '../plugins/dictionary-check.mts'

import type { HotUpdateOptions, ResolvedConfig } from 'vite'

type Development = {
	warnings: string[]
	infos: string[]
	/** Writes a file and passes on the hot update Vite raises for it. */
	save(file: string, code: string): Promise<void>
}

let root: string | undefined

afterEach(async () => {
	if (root) await rm(root, { recursive: true, force: true })
	root = undefined
})

// Starts the plugin the way `vite dev` does, over real files in a temp folder
async function startDevelopment(files: Record<string, string>, strict = false): Promise<Development> {
	root = await mkdtemp(path.join(tmpdir(), 'dictionary-check-'))
	const directory = root
	const write = async (file: string, code: string) => {
		const target = path.join(directory, file)
		await mkdir(path.dirname(target), { recursive: true })
		await writeFile(target, code)
		return target
	}
	for (const [file, code] of Object.entries(files)) await write(file, code)

	const warnings: string[] = []
	const infos: string[] = []
	const config = {
		root: directory,
		command: 'serve',
		plugins: [],
		build: { rolldownOptions: {} },
		logger: {
			warn: (message: string) => void warnings.push(message),
			info: (message: string) => void infos.push(message),
			error: (message: string) => {
				throw new Error(message)
			},
		},
	}
	const context = {
		resolve: (source: string, importer: string) => {
			const id = source.startsWith('/') ? path.join(directory, source) : path.join(path.dirname(importer), source)
			return Promise.resolve(source.match(/^[./]/) && existsSync(id) ? { id, external: false } : null)
		},
	}

	const plugin = localizationDictionaryCheck({ strict }) as unknown as {
		configResolved(config: ResolvedConfig): void
		buildStart: { handler(this: typeof context): void }
		hotUpdate(options: Pick<HotUpdateOptions, 'type' | 'file'>): void
	}
	plugin.configResolved(config as unknown as ResolvedConfig)
	plugin.buildStart.handler.call(context)

	return {
		warnings,
		infos,
		async save(file, code) {
			plugin.hotUpdate({ type: 'update', file: await write(file, code) })
		},
	}
}

const indexHtml = '<html><body><script type="module" src="/src/main.mts"></script></body></html>'

const configModule = `
import { configureLocalization } from '@rooted/localization'
export const localization = configureLocalization({
	default: 'en-GB',
	dictionaries: { 'nl-NL': () => import('./nl-NL.mts') },
})
`

function dictionaryModule(...keys: string[]): string {
	const entries = keys.map(key => `translation(${JSON.stringify(key)}, 'vertaald'),`)
	return `import { dictionary, translation } from '@rooted/localization'\nexport default dictionary(\n${entries.join('\n')}\n)\n`
}

const app = {
	'index.html': indexHtml,
	'src/i18n.mts': configModule,
	'src/nl-NL.mts': dictionaryModule(),
	'src/main.mts': `const routes = { about: () => import('./about.mts') }`,
	'src/about.mts': `import { localization } from './i18n.mts'\nlocalization.text\`About us\``,
}

const missingAboutUs = '[vite-plugin:rooted-localization-dictionary-check] nl-NL is missing 1 entry:\n  "About us"  src/about.mts:2:1'

describe('localizationDictionaryCheck() in vite dev', () => {
	test('reports missing entries on start, including pages nobody opened', async () => {
		// Act
		const development = await startDevelopment(app)

		// Assert
		await vi.waitFor(() => expect(development.warnings).toEqual([missingAboutUs]))
	})

	test('says so once a save fills in the missing entry', async () => {
		// Arrange
		const development = await startDevelopment(app)
		await vi.waitFor(() => expect(development.warnings).toHaveLength(1))

		// Act
		await development.save('src/nl-NL.mts', dictionaryModule('About us'))

		// Assert
		await vi.waitFor(() => expect(development.infos).toEqual([
			'[vite-plugin:rooted-localization-dictionary-check] every dictionary matches its text call sites',
		]))
		expect(development.warnings).toHaveLength(1)
	})

	test('reports a call site added by a save', async () => {
		// Arrange
		const development = await startDevelopment({ ...app, 'src/nl-NL.mts': dictionaryModule('About us') })
		// A clean start logs nothing, so give it time to finish
		await new Promise(resolve => setTimeout(resolve, 300))

		// Act
		await development.save('src/about.mts', `${app['src/about.mts']}\nlocalization.text\`Contact\``)

		// Assert
		await vi.waitFor(() => expect(development.warnings).toEqual([
			'[vite-plugin:rooted-localization-dictionary-check] nl-NL is missing 1 entry:\n  "Contact"  src/about.mts:3:1',
		]))
	})

	test('stays quiet when a save doesn\'t change the report', async () => {
		// Arrange
		const development = await startDevelopment(app)
		await vi.waitFor(() => expect(development.warnings).toHaveLength(1))

		// Act
		await development.save('src/about.mts', `${app['src/about.mts']}\n// a comment`)
		await new Promise(resolve => setTimeout(resolve, 300))

		// Assert
		expect(development.warnings).toEqual([missingAboutUs])
		expect(development.infos).toEqual([])
	})

	test('only warns when strict', async () => {
		// Act
		const development = await startDevelopment(app, true)

		// Assert
		await vi.waitFor(() => expect(development.warnings).toEqual([missingAboutUs]))
	})
})
