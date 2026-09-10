import { VitePWA, type ManifestOptions, type VitePWAOptions } from 'vite-plugin-pwa'

type RuntimeCaching = NonNullable<NonNullable<VitePWAOptions['workbox']>['runtimeCaching']>[number]

import { findDefaultIcon, resolveProjectRoot } from './pwa-icon.mts'

import type { RootedApplicationManifest } from '../src/rooted-manifest.mts'
import type { Plugin, PluginOption } from 'vite'

const imageCacheEntry: RuntimeCaching = {
	urlPattern: /\.(?:webp|avif|jpe?g|png|gif|svg)(?:\?.*)?$/i,
	handler: 'CacheFirst',
	options: {
		cacheName: 'images',
		expiration: {
			maxEntries: 60,
			maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
		},
	},
}

/** What the icon generator writes when it finds `public/icon.svg`. */
const generatedIcons: ManifestOptions['icons'] = [
	{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
	{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
	{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
	{ src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]

/** What's left when there's nothing to generate from. */
const fallbackIcons: ManifestOptions['icons'] = [{ src: 'icon.svg', sizes: 'any' }]

/**
 * Fills in the web manifest icons once Vite tells us where the project root is.
 *
 * It has to happen this late: `vite-plugin-pwa` reads the manifest in its
 * `configResolved`, and `config` is the first hook that knows the root. The
 * plugin keeps a reference to the object we hand it, so writing to
 * `webManifest` here still lands.
 */
export function pwaIconsPlugin(webManifest: Partial<ManifestOptions>, iconConfigured: boolean): Plugin {
	return {
		name: 'rooted:pwa-icons',
		// vite-plugin-pwa is a `pre` plugin, so this has to be one too to run first.
		enforce: 'pre',

		config(config) {
			// An explicit icon goes through vite-plugin-pwa's own asset generator,
			// and icons the app set itself are none of our business.
			if (iconConfigured || webManifest.icons) return

			webManifest.icons = findDefaultIcon(resolveProjectRoot(config))
				? generatedIcons
				: fallbackIcons
		},
	}
}

export type PwaOptions = {
	manifest: RootedApplicationManifest
	skipPwaGenerator: boolean
	minify: boolean
	runtimeCaching: RuntimeCaching[] | undefined
}
export function pwaPreset(
	{ manifest, skipPwaGenerator, minify, runtimeCaching }: PwaOptions,
): PluginOption {
	const webManifest: Partial<ManifestOptions> = {
		name: 'Rooted Template',
		short_name: 'template',
		description: 'Template @rooted/* application.',
		theme_color: '#ffffff',
		background_color: '#f8faf2',
		display: 'standalone',
		...manifest.webManifest,
	}

	return [
		pwaIconsPlugin(webManifest, !!manifest.icon),
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
				runtimeCaching: [imageCacheEntry, ...(runtimeCaching ?? [])],
			},
			...(manifest.icon && {
				pwaAssets: {
					preset: 'minimal-2023',
					image: manifest.icon,
					overrideManifestIcons: true,
				},
			}),
			manifest: webManifest,
		}),
	]
}
