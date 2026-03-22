import { cssLoader } from '@rooted/components/css-loader'
import { defineConfig } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import { ManifestOptions, VitePWA } from 'vite-plugin-pwa'

import { importCycleDetector, type ImportCycleOptions } from '../plugins/import-cycle-detector.mts'
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

type ArrayElement<T> = T extends readonly (infer U)[] ? U : T
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
	seo?: SeoOptions
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
				VitePWA({
					// Utility for speeding up build times
					disable: skipPwaGenerator,
					registerType: 'autoUpdate',
					filename: `worker.js`,
					minify,
					manifestFilename: `${manifest.webManifest.id}.webmanifest`,
					workbox: {
						sourcemap: !minify,
						navigateFallbackDenylist: [/\.\w+$/],
					},
					manifest: {
						name: 'Rooted Template',
						short_name: 'template',
						description: 'Template @rooted/* application.',
						theme_color: '#ffffff',
						background_color: '#f8faf2',
						display: 'standalone',
						// TODO generate based on svg using svgo
						// TODO default to favicon.ico from public folder
						icons: [
							{
								src: 'pwa-192x192.png',
								sizes: '192x192',
								type: 'image/png',
							},
							{
								src: 'pwa-512x512.png',
								sizes: '512x512',
								type: 'image/png',
							},
						],
						...manifest.webManifest,
					},
				}),
				seoPlugin(manifest.webManifest.url, manifest.seo),
			],
		}
	}

	return defineConfig(buildConfig)
}
