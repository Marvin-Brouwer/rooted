import { ManifestOptions, VitePWA } from 'vite-plugin-pwa'

import type { RootedApplicationManifest } from '../src/rooted-manifest.mts'

export function pwaPreset(
	manifest: RootedApplicationManifest,
	{ skipPwaGenerator, minify, autoIcon }: { skipPwaGenerator: boolean; minify: boolean; autoIcon: boolean },
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
