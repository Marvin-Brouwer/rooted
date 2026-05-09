import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { SeoApi } from './seo-api.mts'
import type { PluginOption, ResolvedConfig } from 'vite'

const DEFAULT_ICON_PATH = 'public/icon.svg'
const SEO_PLUGIN_NAME = 'rooted:seo'

/**
 * Generates PWA icon assets from the project's `public/icon.svg` using the
 * `@vite-pwa/assets-generator` API when no explicit icon is configured.
 *
 * Uses the `minimal-2023` preset (without `favicon.ico`; SVG is used instead),
 * which produces:
 * - `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png` (transparent)
 * - `maskable-icon-512x512.png` (maskable)
 * - `apple-touch-icon-180x180.png` (Apple)
 *
 * Assets are written to `public/` and are skipped when they already exist on
 * disk (`overrideAssets: false`).
 *
 * When a deployment URL is configured and the SEO plugin is present, registers
 * the generated icons as a `sitemap-icons.xml` entry via `SeoApi.addSitemap`.
 *
 * @internal Automatically included by {@link rootedManifest}. Only runs during
 * production builds when no `icon` is set in the manifest options.
 */
export function pwaAssetsPlugin(skip: boolean, deploymentUrl: string | undefined): PluginOption {
	let viteConfig: ResolvedConfig
	let seoApi: SeoApi | undefined

	return {
		name: 'rooted:pwa-assets',
		apply: 'build',

		configResolved(config) {
			viteConfig = config
			const seoPlugin = config.plugins.find(p => p.name === SEO_PLUGIN_NAME)
			seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
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

			if (!seoApi) return

			const toAbsolute = (filename: string) =>
				deploymentUrl ? new URL(filename, deploymentUrl).href : `${viteConfig.base}${filename}`
			const today = new Date().toISOString().slice(0, 10)

			seoApi.addSitemap({
				name: 'icons',
				entries: [
					{ loc: toAbsolute('pwa-512x512.png'), lastmod: today },
					{ loc: toAbsolute('pwa-192x192.png'), lastmod: today },
					{ loc: toAbsolute('apple-touch-icon-180x180.png'), lastmod: today },
				],
			})
		},
	}
}
