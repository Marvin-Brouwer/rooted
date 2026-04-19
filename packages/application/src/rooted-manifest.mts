import { existsSync } from 'node:fs'
import path from 'node:path'

import { cssLoader } from '@rooted/components/css-loader'
import { ArrayElement } from '@rooted/util'
import { defineConfig } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import { ManifestOptions, type VitePWAOptions } from 'vite-plugin-pwa'

type RuntimeCaching = NonNullable<NonNullable<VitePWAOptions['workbox']>['runtimeCaching']>[number]

import { importCycleDetector, type ImportCycleOptions } from '../plugins/import-cycle-detector.mts'
import { pwaAssetsPlugin } from '../plugins/pwa-assets.mts'
import { pwaPreset } from '../plugins/pwa-preset.mts'
import { SeoOptions, seoPlugin } from '../plugins/seo.mts'

import type { BuildEnvironmentOptions, ConfigEnv, UserConfig } from 'vite'

function codeSplittingGroups(applicationGroups: CodeSplittingGroups): CodeSplittingGroups {
	return [
		// Group all @rooted/* packages into a single vendor chunk
		{ name: 'vendor/@rooted', test: id => id.startsWith('@rooted') },
		// Custom groups should be hit before the _shared in case they're grouped and in the folder
		...applicationGroups,
		// Chunk shared if not imported correctly
		{
			priority: Number.NEGATIVE_INFINITY,
			entriesAware: true,
			name: (id) => {
				const index = id.indexOf('_shared/')
				if (index === -1) return
				const folder = id.slice(index + '_shared/'.length).split('/')[0]
				return `shared/${folder}`
			},
			test: id => id.includes('_shared/'),
		},
	]
}

type RolldownOptions = NonNullable<BuildEnvironmentOptions['rolldownOptions']>
type TreeshakeOptions = ArrayElement<NonNullable<RolldownOptions['treeshake']>>
type OutputOptions = ArrayElement<NonNullable<RolldownOptions['output']>>
export type CodeSplittingOptions = NonNullable<Exclude<OutputOptions['codeSplitting'], boolean>>
export type CodeSplittingGroups = NonNullable<CodeSplittingOptions['groups']>

export type DetectorOptions = {
	importCycle?: ImportCycleOptions
}

export type RootedApplicationManifest = {
	resolve?: UserConfig['resolve']
	plugins?: UserConfig['plugins']
	codeSplitting?: CodeSplittingOptions
	detectors?: DetectorOptions
	treeshaking?: TreeshakeOptions
	webManifest: Partial<ManifestOptions> & {
		id: ManifestOptions['id']
		/** Deployment URL (e.g. `homepage` from `package.json`). The pathname is used as Vite's `base`. */
		url?: string
	}
	/**
	 * Path (relative to Vite root) to the source SVG used to generate PWA icons.
	 * Example: `'public/icon.svg'`
	 * When omitted, `public/icon.svg` is used automatically if the file exists.
	 * If neither is available, icons fall back to `[{ src: 'icon.svg', sizes: 'any' }]`.
	 */
	icon?: string
	seo?: SeoOptions
	runtimeCaching?: RuntimeCaching[]
}

function resolveBase(url: string | undefined): string | undefined {
	if (!url) return undefined
	const pathname = new URL(url).pathname
	if (!pathname.endsWith('/')) {
		throw new Error(`manifest.webManifest.url pathname must end with a slash, got: "${pathname}"`)
	}
	return pathname
}

export function rootedManifest(manifest: RootedApplicationManifest) {
	function buildConfig(environment: ConfigEnv): UserConfig {
		const minify = environment.command === 'build' && process.argv.includes('--minify')
		const mangle = !process.argv.includes('--no-mangle')
		const analyzerMode = environment.command === 'build' && process.argv.includes('--analyze')

		const skipPwaGenerator = analyzerMode || process.argv.includes('--no-pwa')
		const autoIcon = !manifest.icon && existsSync(path.resolve(process.cwd(), 'public/icon.svg'))

		return {
			appType: 'spa',
			base: resolveBase(manifest.webManifest.url),
			resolve: manifest.resolve,
			dev: {
				sourcemap: true,
			},
			build: {
				rolldownOptions: {
					treeshake: manifest.treeshaking ?? {
						moduleSideEffects: 'no-external',
						propertyReadSideEffects: false,
						unknownGlobalSideEffects: false,
					},
					output: {
						codeSplitting: {
							groups: [
								...codeSplittingGroups(manifest.codeSplitting?.groups ?? []),
							],
						},
						...(mangle && {
							entryFileNames: '[hash].js',
							chunkFileNames: '[hash].js',
							assetFileNames: '[hash][extname]',
						}),
					},
				},
				target: 'esnext',
				cssMinify: 'esbuild',
				minify: 'terser',
			},
			esbuild: {
				sourcemap: 'external',
				minifyWhitespace: minify,
				treeShaking: true,
			},
			plugins: [
				importCycleDetector(manifest.detectors?.importCycle),
				...manifest.plugins ?? [],
				cssLoader({
					minify,
				}),
				// We still use the analyzer in static when disabled
				// We noticed completely disabling the analyzer resulted in bigger bundles somehow
				analyzer(analyzerMode
					? {
						analyzerMode: 'server',
						openAnalyzer: true,
						exclude: [
							// Only take one flavor of css, this distracts from the bundle size
							/\.tagged\.css$/is,
							/\.tagged-[A-Za-z0-9_-]+\.css$/i,
						],
					}
					: {
						analyzerMode: 'static',
					},
				),
				pwaPreset({ manifest, skipPwaGenerator, minify, autoIcon, runtimeCaching: manifest.runtimeCaching }),
				pwaAssetsPlugin(!!manifest.icon || skipPwaGenerator),
				seoPlugin(manifest.webManifest.url, manifest.webManifest, manifest.seo),
			],
		}
	}

	return defineConfig(buildConfig)
}
