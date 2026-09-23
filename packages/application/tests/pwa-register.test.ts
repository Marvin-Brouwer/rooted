// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { buildRegisterScript, pwaRegisterPlugin } from '../plugins/pwa-register.mts'

import type { Plugin, ResolvedConfig } from 'vite'

/** Stands in for the built `@rooted/pwa` entry, which is one self-contained module. */
const clientSource = 'function registerWorker() {}\nexport { registerWorker };\n//# sourceMappingURL=data:application/json;base64,e30=\n'

let root: string
let clientModule: string

beforeEach(async () => {
	root = await mkdtemp(path.join(tmpdir(), 'rooted-pwa-register-'))
	clientModule = path.join(root, 'pwa.mjs')
	await writeFile(clientModule, clientSource, 'utf8')
})

afterEach(async () => {
	await rm(root, { recursive: true, force: true })
})

type Hooks = Plugin & {
	configResolved: (config: ResolvedConfig) => void
	buildStart: () => Promise<void>
	transformIndexHtml: () => { attrs: Record<string, string> }[] | undefined
}

/** Drives the plugin's hooks the way Vite would, without booting Vite. */
function build(options: { skip?: boolean, base?: string, clientModule?: string } = {}) {
	const { skip = false, base = '/' } = options
	const emitFile = vi.fn()

	const plugin = pwaRegisterPlugin({
		skip,
		clientModule: options.clientModule ?? clientModule,
	}) as Hooks
	plugin.configResolved.call(plugin, { base } as ResolvedConfig)

	return {
		emitFile,
		start: () => plugin.buildStart.call({ emitFile } as unknown as Plugin),
		transformHtml: () => plugin.transformIndexHtml.call(plugin),
	}
}

describe('buildRegisterScript()', () => {
	test('appends the call that starts the registration', async () => {
		// Act
		const script = await buildRegisterScript(clientModule)

		// Assert
		expect(script).toContain('function registerWorker() {}')
		expect(script.trimEnd().endsWith('registerWorker()')).toBe(true)
	})

	test('drops the inline sourcemap, which nobody debugs and which triples the size', async () => {
		// Act
		const script = await buildRegisterScript(clientModule)

		// Assert
		expect(script).not.toContain('sourceMappingURL')
	})

	test('names the missing file when @rooted/pwa has not been built', async () => {
		// Arrange
		const missing = path.join(root, 'not-built.mjs')

		// Act
		const failure = buildRegisterScript(missing)

		// Assert
		await expect(failure).rejects.toThrow(missing)
	})

	test('refuses a client module that imports a sibling, since the script is emitted on its own', async () => {
		// Arrange
		await writeFile(clientModule, 'import { handOver } from "./registration.mjs"\n', 'utf8')

		// Act
		const failure = buildRegisterScript(clientModule)

		// Assert
		await expect(failure).rejects.toThrow('standalone')
	})

	test('refuses a client module that no longer exports registerWorker', async () => {
		// Arrange
		await writeFile(clientModule, 'export const somethingElse = 1\n', 'utf8')

		// Act
		const failure = buildRegisterScript(clientModule)

		// Assert
		await expect(failure).rejects.toThrow('registerWorker')
	})
})

describe('pwaRegisterPlugin()', () => {
	test('emits the script and points a module script tag at it', async () => {
		// Arrange
		const { emitFile, start, transformHtml } = build()

		// Act
		await start()
		const tags = transformHtml()

		// Assert
		const [emitted] = emitFile.mock.calls[0] as [{ type: string, fileName: string, source: string }]
		expect(emitted.type).toBe('asset')
		expect(emitted.fileName).toMatch(/^worker-register\.[\da-f]{8}\.js$/)
		expect(tags).toEqual([{
			tag: 'script',
			attrs: { type: 'module', src: `/${emitted.fileName}` },
			injectTo: 'body',
		}])
	})

	test('prefixes the src with the vite base, so a sub-path deploy still finds it', async () => {
		// Arrange
		const { start, transformHtml } = build({ base: '/recipe-book/' })

		// Act
		await start()
		const [tag] = transformHtml() ?? []

		// Assert
		expect(tag.attrs.src).toMatch(/^\/recipe-book\/worker-register\./)
	})

	test('emits nothing when the pwa generator is skipped, because there is no worker to register', async () => {
		// Arrange
		const { emitFile, start, transformHtml } = build({ skip: true })

		// Act
		await start()

		// Assert
		expect(emitFile).not.toHaveBeenCalled()
		expect(transformHtml()).toBeUndefined()
	})
})
