import path from 'node:path'

import { describe, test, expect } from 'vitest'

import { route } from '@rooted/router/routes'

import { localizationDictionaryCheck, type DictionaryCheckOptions } from '../plugins/dictionary-check.mts'
import { dictionary, translation } from '../src/dictionary.mts'
import { configureLocalization } from '../src/localization.mts'

import type { ResolvedConfig } from 'vite'

type SourceFiles = Record<string, string>

type CheckSetup = DictionaryCheckOptions & {
	/** Routes for a fake route manifest plugin. Without them there's no manifest. */
	routes?: unknown[]
}

const root = '/app'

// Runs the plugin's hooks the way a build would, over in-memory modules keyed by path relative to the root
async function check(files: SourceFiles, { routes, ...options }: CheckSetup = {}): Promise<string[]> {
	const warnings: string[] = []
	const ids = new Set(Object.keys(files).map(file => path.posix.join(root, file)))
	const context = {
		resolve: (source: string, importer: string) => {
			const id = path.posix.join(path.posix.dirname(importer), source)
			return Promise.resolve(source.startsWith('.') && ids.has(id) ? { id, external: false } : null)
		},
		warn: (message: string) => void warnings.push(message),
		error: (message: string) => {
			throw new Error(message)
		},
	}
	const manifestPlugins = routes ? [{ name: 'vite-plugin:generate-rooted-route-manifest', api: { routes } }] : []

	const plugin = localizationDictionaryCheck(options)
	const hooks = plugin as unknown as {
		configResolved(config: ResolvedConfig): void
		buildStart(): void
		transform: { handler(this: typeof context, code: string, id: string): void }
		buildEnd(this: typeof context, error?: Error): Promise<void>
	}
	hooks.configResolved({ root, plugins: manifestPlugins } as unknown as ResolvedConfig)
	hooks.buildStart()
	for (const [file, code] of Object.entries(files)) hooks.transform.handler.call(context, code, path.posix.join(root, file))
	await hooks.buildEnd.call(context)

	return warnings
}

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

describe('localizationDictionaryCheck()', () => {
	test('reports a missing entry with the location of its call site', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': dictionaryModule(),
			'page.mts': `import { localization } from './i18n.mts'\nconst title = localization.text\`Browse categories\``,
		}

		// Act
		const warnings = await check(files)

		// Assert
		expect(warnings).toEqual(['nl-NL is missing 1 entry:\n  "Browse categories"  page.mts:2:15'])
	})

	test('reports nothing when every call site has an entry', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': dictionaryModule('Browse categories'),
			'page.mts': `import { localization } from './i18n.mts'\nlocalization.text\`Browse categories\``,
		}

		// Act
		const warnings = await check(files)

		// Assert
		expect(warnings).toEqual([])
	})

	test('matches parameterised call sites on the text around the parameters', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': dictionaryModule('hello {lastName}, {firstName}'),
			'page.mts': `import { localization } from './i18n.mts'\nlocalization.text\`hello \${last}, \${first}\``,
		}

		// Act
		const warnings = await check(files)

		// Assert
		expect(warnings).toEqual([])
	})

	test('follows renamed imports, re-exports, namespaces and a destructured text', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': dictionaryModule(),
			'shared.mts': `export { localization as l } from './i18n.mts'`,
			'barrel.mts': `export * from './shared.mts'`,
			'renamed.mts': `import { localization as i18n } from './i18n.mts'\ni18n.text\`renamed\``,
			'reexported.mts': `import { l } from './barrel.mts'\nl.text\`re-exported\``,
			'namespace.mts': `import * as shared from './shared.mts'\nshared.l.text\`namespace\``,
			'destructured.mts': `import { localization } from './i18n.mts'\nconst { text: t } = localization\nt\`destructured\``,
		}

		// Act
		const warnings = await check(files)

		// Assert
		expect(warnings).toHaveLength(1)
		for (const text of ['renamed', 're-exported', 'namespace', 'destructured']) expect(warnings[0]).toContain(`"${text}"`)
	})

	test('follows a default export', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule.replace('export const localization =', 'export default'),
			'nl-NL.mts': dictionaryModule(),
			'page.mts': `import localization from './i18n.mts'\nlocalization.text\`default export\``,
		}

		// Act
		const warnings = await check(files)

		// Assert
		expect(warnings).toEqual(['nl-NL is missing 1 entry:\n  "default export"  page.mts:2:1'])
	})

	test('ignores text tags that don\'t lead to configureLocalization', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': dictionaryModule(),
			'other.mts': `export const localization = { text: String.raw }`,
			'page.mts': `import { localization } from './other.mts'\nimport { text } from 'somewhere'\nlocalization.text\`not ours\`\ntext\`not ours either\``,
		}

		// Act
		const warnings = await check(files)

		// Assert
		expect(warnings).toEqual([])
	})

	test('warns about entries no call site uses', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': dictionaryModule('Browse categories', 'old label'),
			'page.mts': `import { localization } from './i18n.mts'\nlocalization.text\`Browse categories\``,
		}

		// Act
		const warnings = await check(files)

		// Assert
		expect(warnings).toEqual(['nl-NL has 1 unused entry:\n  "old label"  nl-NL.mts'])
	})

	test('fails the build on missing entries when strict', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': dictionaryModule(),
			'page.mts': `import { localization } from './i18n.mts'\nlocalization.text\`Browse categories\``,
		}

		// Act
		const result = check(files, { strict: true })

		// Assert
		await expect(result).rejects.toThrow('nl-NL is missing 1 entry')
	})

	test('only warns about unused entries when strict', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': dictionaryModule('old label'),
		}

		// Act
		const warnings = await check(files, { strict: true })

		// Assert
		expect(warnings).toEqual(['nl-NL has 1 unused entry:\n  "old label"  nl-NL.mts'])
	})

	test('notes dictionary keys it can\'t read from source', async () => {
		// Arrange
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': `import { dictionary, translation } from '@rooted/localization'\nconst key = 'computed'\nexport default dictionary(translation(key, 'berekend'))`,
		}

		// Act
		const warnings = await check(files)

		// Assert
		expect(warnings).toEqual([
			'nl-NL: 1 entry has a key that isn\'t a string literal in nl-NL.mts, so it isn\'t checked and may cover some of the missing entries.',
		])
	})

	test('reads evaluated dictionaries through the locale token when the route manifest has one', async () => {
		// Arrange
		const key = ['computed', 'label'].join(' ')
		const localization = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': () => Promise.resolve({ default: dictionary(translation(key, 'berekend label')) }) },
		})
		const homeRoute = route`/${localization.parameter}/`({ resolve: () => Promise.resolve(void 0) })
		const files = {
			'i18n.mts': configModule,
			'nl-NL.mts': `import { dictionary, translation } from '@rooted/localization'\nexport default dictionary(translation(['computed', 'label'].join(' '), 'berekend label'))`,
			'page.mts': `import { localization } from './i18n.mts'\nlocalization.text\`computed label\``,
		}

		// Act
		const warnings = await check(files, { routes: [homeRoute] })

		// Assert
		expect(warnings).toEqual([])
	})
})
