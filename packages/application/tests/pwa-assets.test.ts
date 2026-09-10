// @vitest-environment node
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { pwaAssetsPlugin } from '../plugins/pwa-assets.mts'

import type { ConfigEnv, Plugin, ResolvedConfig, UserConfig } from 'vite'
import type { ManifestOptions } from 'vite-plugin-pwa'

const squareSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#0a0"/></svg>'

let root: string

beforeEach(async () => {
	root = await mkdtemp(path.join(tmpdir(), 'rooted-pwa-assets-'))
})

afterEach(async () => {
	await rm(root, { recursive: true, force: true })
})

async function writeDefaultIcon() {
	await mkdir(path.join(root, 'public'), { recursive: true })
	await writeFile(path.join(root, 'public', 'icon.svg'), squareSvg, 'utf8')
}

type Hooks = Plugin & {
	config: (config: UserConfig, environment: ConfigEnv) => void
	configResolved: (config: ResolvedConfig) => void
	buildStart: () => Promise<void>
}

/** Drives the plugin's hooks the way Vite would, without booting Vite. */
function build(options: { skip?: boolean, webManifest?: Partial<ManifestOptions>, config?: UserConfig } = {}) {
	const { skip = false, webManifest = {}, config = { root } } = options
	const warn = vi.fn()

	const plugin = pwaAssetsPlugin({ webManifest, skip, deploymentUrl: undefined }) as Hooks
	plugin.config.call(plugin, config, { command: 'build', mode: 'production' })
	plugin.configResolved.call(plugin, {
		root,
		base: '/',
		plugins: [],
		logger: { info: vi.fn(), warn },
	} as unknown as ResolvedConfig)

	return { warn, webManifest, start: () => plugin.buildStart.call(plugin) }
}

describe('pwaAssetsPlugin()', () => {
	test('lists the generated icons when public/icon.svg sits under the vite project root', async () => {
		// Arrange
		await writeDefaultIcon()

		// Act
		const { webManifest } = build()

		// Assert -- the working directory during a test run is the repo root, so
		// finding the icon at all proves config.root was used
		expect(path.resolve(process.cwd(), 'public/icon.svg')).not.toBe(path.join(root, 'public', 'icon.svg'))
		expect(webManifest.icons?.map(icon => icon.src)).toEqual([
			'pwa-64x64.png',
			'pwa-192x192.png',
			'pwa-512x512.png',
			'maskable-icon-512x512.png',
		])
	})

	test('falls back to the svg when the root has no icon to generate from', () => {
		// Act
		const { webManifest } = build()

		// Assert
		expect(webManifest.icons).toEqual([{ src: 'icon.svg', sizes: 'any' }])
	})

	test('reads the working directory when the config has no root, the way vite does', () => {
		// Act
		const { webManifest } = build({ config: {} })

		// Assert -- the repo root has no public/icon.svg
		expect(webManifest.icons).toEqual([{ src: 'icon.svg', sizes: 'any' }])
	})

	test('leaves icons the application configured alone', async () => {
		// Arrange
		await writeDefaultIcon()

		// Act
		const { webManifest } = build({ webManifest: { icons: [{ src: 'mine.png', sizes: '48x48' }] } })

		// Assert
		expect(webManifest.icons).toEqual([{ src: 'mine.png', sizes: '48x48' }])
	})

	test('stays out of the manifest when the generator is turned off', async () => {
		// Arrange
		await writeDefaultIcon()

		// Act
		const { webManifest } = build({ skip: true })

		// Assert -- an explicit icon is vite-plugin-pwa's to generate and inject
		expect(webManifest.icons).toBeUndefined()
	})

	test('warns which directory it looked in when there is no icon to generate from', async () => {
		// Arrange
		const { warn, start } = build()

		// Act
		await start()

		// Assert -- the silent no-op in #316 is what made this hard to spot
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('public/icon.svg')
		expect(warn.mock.calls[0][0]).toContain(root)
	})

	test('says nothing when the generator is turned off', async () => {
		// Arrange
		const { warn, start } = build({ skip: true })

		// Act
		await start()

		// Assert
		expect(warn).not.toHaveBeenCalled()
	})

	test('generates the icons next to the svg it found under the vite project root', async () => {
		// Arrange
		await writeDefaultIcon()
		const { warn, start } = build()

		// Act
		await start()

		// Assert
		expect(warn).not.toHaveBeenCalled()
		expect(await readdir(path.join(root, 'public'))).toContain('pwa-512x512.png')
	})
})
