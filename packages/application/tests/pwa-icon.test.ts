// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { pwaIconsPlugin } from '../plugins/pwa-preset.mts'

import type { ConfigEnv, Plugin, UserConfig } from 'vite'
import type { ManifestOptions } from 'vite-plugin-pwa'

let root: string

beforeEach(async () => {
	root = await mkdtemp(path.join(tmpdir(), 'rooted-pwa-'))
})

afterEach(async () => {
	await rm(root, { recursive: true, force: true })
})

async function writeDefaultIcon() {
	await mkdir(path.join(root, 'public'), { recursive: true })
	await writeFile(path.join(root, 'public', 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />', 'utf8')
}

/** Runs the plugin's `config` hook the way Vite would, without booting Vite. */
function resolveIcons(
	webManifest: Partial<ManifestOptions>,
	options: { iconConfigured?: boolean, config?: UserConfig } = {},
) {
	const { iconConfigured = false, config = { root } } = options
	const plugin = pwaIconsPlugin(webManifest, iconConfigured) as Plugin & {
		config: (config: UserConfig, environment: ConfigEnv) => void
	}
	plugin.config.call(plugin, config, { command: 'build', mode: 'production' })
	return webManifest.icons
}

describe('pwaIconsPlugin()', () => {
	test('lists the generated icons when public/icon.svg sits under the vite project root', async () => {
		// Arrange
		await writeDefaultIcon()
		const webManifest: Partial<ManifestOptions> = {}

		// Act
		const icons = resolveIcons(webManifest)

		// Assert -- the working directory during a test run is the repo root, so
		// finding the icon at all proves config.root was used
		expect(path.resolve(process.cwd(), 'public/icon.svg')).not.toBe(path.join(root, 'public', 'icon.svg'))
		expect(icons?.map(icon => icon.src)).toEqual([
			'pwa-64x64.png',
			'pwa-192x192.png',
			'pwa-512x512.png',
			'maskable-icon-512x512.png',
		])
	})

	test('falls back to the svg when the root has no icon to generate from', () => {
		// Arrange
		const webManifest: Partial<ManifestOptions> = {}

		// Act
		const icons = resolveIcons(webManifest)

		// Assert
		expect(icons).toEqual([{ src: 'icon.svg', sizes: 'any' }])
	})

	test('reads the working directory when the config has no root, the way vite does', () => {
		// Arrange
		const webManifest: Partial<ManifestOptions> = {}

		// Act
		const icons = resolveIcons(webManifest, { config: {} })

		// Assert -- the repo root has no public/icon.svg
		expect(icons).toEqual([{ src: 'icon.svg', sizes: 'any' }])
	})

	test('leaves icons the application configured alone', async () => {
		// Arrange
		await writeDefaultIcon()
		const webManifest: Partial<ManifestOptions> = { icons: [{ src: 'mine.png', sizes: '48x48' }] }

		// Act
		const icons = resolveIcons(webManifest)

		// Assert
		expect(icons).toEqual([{ src: 'mine.png', sizes: '48x48' }])
	})

	test('stays out of the way when the manifest names its own icon source', async () => {
		// Arrange
		await writeDefaultIcon()
		const webManifest: Partial<ManifestOptions> = {}

		// Act
		const icons = resolveIcons(webManifest, { iconConfigured: true })

		// Assert -- vite-plugin-pwa generates and injects those icons itself
		expect(icons).toBeUndefined()
	})
})
