// @vitest-environment node
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { pwaAssetsPlugin } from '../plugins/pwa-assets.mts'

import type { Plugin, ResolvedConfig } from 'vite'

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

/** Drives the plugin's hooks the way Vite would, without booting Vite. */
function build(skip = false) {
	const warn = vi.fn()
	const config = {
		root,
		base: '/',
		plugins: [],
		logger: { info: vi.fn(), warn },
	} as unknown as ResolvedConfig

	const plugin = pwaAssetsPlugin(skip, undefined) as Plugin & {
		configResolved: (config: ResolvedConfig) => void
		buildStart: () => Promise<void>
	}
	plugin.configResolved.call(plugin, config)

	return { warn, start: () => plugin.buildStart.call(plugin) }
}

describe('pwaAssetsPlugin()', () => {
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
		const { warn, start } = build(true)

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
