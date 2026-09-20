// @vitest-environment node
import { describe, expect, test } from 'vitest'

import { pwaPresetOptions } from '../plugins/pwa-preset.mts'

import type { RootedApplicationManifest } from '../src/rooted-manifest.mts'

function options(manifest: Partial<RootedApplicationManifest> = {}) {
	return pwaPresetOptions({
		manifest: { webManifest: { id: 'test-app' }, ...manifest } as RootedApplicationManifest,
		webManifest: { id: 'test-app' },
		skipPwaGenerator: false,
		minify: false,
		runtimeCaching: undefined,
	})
}

describe('pwaPresetOptions()', () => {
	test('leaves the running page alone, which autoUpdate did not', () => {
		// Act
		const preset = options()

		// Assert -- #331: autoUpdate makes workbox emit skipWaiting() and clientsClaim(),
		// so a new worker claimed the open document and its unvisited route chunks 404'd.
		expect(preset.registerType).toBe('prompt')
	})

	test('keeps vite-plugin-pwa from injecting its own registration', () => {
		// Act
		const preset = options()

		// Assert -- registerSW.js only registers.
		// rooted emits a script that also checks for updates while the app runs.
		expect(preset.injectRegister).toBe(false)
	})

	test('puts the user runtime caching after the built-in image rule', () => {
		// Arrange
		const apiCache = { urlPattern: /\/api\//, handler: 'NetworkFirst' as const }

		// Act
		const preset = pwaPresetOptions({
			manifest: { webManifest: { id: 'test-app' } } as RootedApplicationManifest,
			webManifest: { id: 'test-app' },
			skipPwaGenerator: false,
			minify: false,
			runtimeCaching: [apiCache],
		})

		// Assert
		expect(preset.workbox?.runtimeCaching).toHaveLength(2)
		expect(preset.workbox?.runtimeCaching?.at(-1)).toBe(apiCache)
	})
})
