import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { PluginOption, ResolvedConfig } from 'vite'

const DEFAULT_ICON_PATH = 'public/icon.svg'

/**
 * Generates PWA icon assets from the project's `public/icon.svg` using the
 * `@vite-pwa/assets-generator` API when no explicit icon is configured.
 *
 * Uses the `minimal-2023` preset (without `favicon.ico` — SVG is used instead),
 * which produces:
 * - `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png` (transparent)
 * - `maskable-icon-512x512.png` (maskable)
 * - `apple-touch-icon-180x180.png` (Apple)
 *
 * Assets are written to `public/` and are skipped when they already exist on
 * disk (`overrideAssets: false`).
 *
 * @internal Automatically included by {@link rootedManifest}. Only runs during
 * production builds when no `icon` is set in the manifest options.
 */
export function pwaAssetsPlugin(skip: boolean): PluginOption {
	let viteConfig: ResolvedConfig

	return {
		name: 'rooted:pwa-assets',
		apply: 'build',

		configResolved(config) {
			viteConfig = config
		},

		async buildStart() {
			if (skip) return

			const svgPath = path.resolve(viteConfig.root, DEFAULT_ICON_PATH)
			if (!fs.existsSync(svgPath)) return

			const [
				{ instructions },
				{ generateAssets },
				{ minimal2023Preset },
			] = await Promise.all([
				import('@vite-pwa/assets-generator/api/instructions'),
				import('@vite-pwa/assets-generator/api/generate-assets'),
				import('@vite-pwa/assets-generator/presets/minimal-2023'),
			])

			const preset = {
				...minimal2023Preset,
				transparent: {
					...minimal2023Preset.transparent,
					favicons: [],
				},
			}

			const inst = await instructions({
				imageResolver: () => readFile(svgPath),
				imageName: svgPath,
				originalName: path.basename(svgPath),
				preset,
				htmlLinks: { xhtml: false, includeId: false },
				basePath: viteConfig.base,
				resolveSvgName(name) { return path.basename(name) },
			})

			await generateAssets(inst, false, path.dirname(svgPath), (message, ignored) => {
				if (!ignored) viteConfig.logger.info(message)
			})
		},
	}
}
