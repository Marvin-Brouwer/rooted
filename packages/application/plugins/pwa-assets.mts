import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { seoPluginName } from '@rooted/seo'

import type { SeoApi } from '@rooted/seo'
import type { PluginOption, ResolvedConfig, UserConfig } from 'vite'
import type { ManifestOptions } from 'vite-plugin-pwa'

const DEFAULT_ICON_PATH = 'public/icon.svg'

/** What the `minimal-2023` preset writes, minus the Apple touch icon, which the manifest doesn't list. */
const generatedIcons: ManifestOptions['icons'] = [
	{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
	{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
	{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
	{ src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]

/** What's left when there's nothing to generate from. */
const fallbackIcons: ManifestOptions['icons'] = [{ src: 'icon.svg', sizes: 'any' }]

/** Absolute path to `public/icon.svg` under `root`, or `undefined` when it isn't there. */
function findDefaultIcon(root: string): string | undefined {
	const iconPath = path.resolve(root, DEFAULT_ICON_PATH)
	return existsSync(iconPath) ? iconPath : undefined
}

export type PwaAssetsOptions = {
	/** The manifest handed to `vite-plugin-pwa`, so the icons this generates can be written into it. */
	webManifest: Partial<ManifestOptions>
	skip: boolean
	deploymentUrl: string | undefined
}

/**
 * Generates PWA icon assets from the project's `public/icon.svg` using the
 * `@vite-pwa/assets-generator` API when no explicit icon is configured, and
 * lists them in the web manifest.
 *
 * Uses the `minimal-2023` preset (without `favicon.ico`; SVG is used instead),
 * which produces:
 * - `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png` (transparent)
 * - `maskable-icon-512x512.png` (maskable)
 * - `apple-touch-icon-180x180.png` (Apple)
 *
 * Assets are written to `public/` and are skipped when they already exist on
 * disk (`overrideAssets: false`). When there's no icon to generate from, the
 * manifest falls back to `icon.svg` and the build says so.
 *
 * When a deployment URL is configured and the SEO plugin is present, registers
 * the generated icons as a `sitemap-icons.xml` entry via `SeoApi.addSitemap`.
 *
 * @internal Automatically included by {@link rootedManifest}. Only runs during
 * production builds when no `icon` is set in the manifest options.
 */
export function pwaAssetsPlugin({ webManifest, skip, deploymentUrl }: PwaAssetsOptions): PluginOption {
	let viteConfig: ResolvedConfig
	let seoApi: SeoApi | undefined

	return {
		name: 'rooted:pwa-assets',
		apply: 'build',

		// Vite hasn't resolved a root yet while `rootedManifest` builds the config,
		// and vite-plugin-pwa reads the manifest in its `configResolved`. `config`
		// is the moment in between: the root is known, and writing to the object
		// vite-plugin-pwa holds still counts.
		config(config: UserConfig) {
			if (skip) return

			// The same rule Vite applies, because it hasn't applied it yet.
			const root = config.root ? path.resolve(config.root) : process.cwd()
			webManifest.icons ??= findDefaultIcon(root) ? generatedIcons : fallbackIcons
		},

		configResolved(config) {
			viteConfig = config
			const seoPlugin = config.plugins.find(p => p.name === seoPluginName)
			seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
		},

		async buildStart() {
			if (skip) return

			const svgPath = findDefaultIcon(viteConfig.root)
			if (!svgPath) {
				viteConfig.logger.warn(
					`[rooted:pwa-assets] no ${DEFAULT_ICON_PATH} in ${viteConfig.root}, so no PWA icons were generated. `
					+ 'Add that file, or set `icon` in the rooted manifest to generate from somewhere else.',
				)
				return
			}

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
