import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa'

type RuntimeCaching = NonNullable<NonNullable<VitePWAOptions['workbox']>['runtimeCaching']>[number]

import type { RootedApplicationManifest } from '../src/rooted-manifest.mts'

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

export type PwaOptions = {
	manifest: RootedApplicationManifest
	skipPwaGenerator: boolean
	minify: boolean
	autoIcon: boolean
	runtimeCaching: RuntimeCaching[] | undefined
}
export function pwaPreset(
	{ manifest, skipPwaGenerator, minify, autoIcon, runtimeCaching }: PwaOptions,
) {
	return VitePWA({
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
		manifest: {
			name: 'Rooted Template',
			short_name: 'template',
			description: 'Template @rooted/* application.',
			theme_color: '#ffffff',
			background_color: '#f8faf2',
			display: 'standalone',
			...(!manifest.icon && {
				icons: manifest.webManifest.icons ?? (autoIcon
					? [
						{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
						{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
						{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
						{ src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
					]
					: [{ src: 'icon.svg', sizes: 'any' }]),
			}),
			...manifest.webManifest,
		},
	})
}
