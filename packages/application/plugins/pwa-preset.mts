import { VitePWA, type ManifestOptions, type VitePWAOptions } from 'vite-plugin-pwa'

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

/**
 * The web manifest, minus the icons: those depend on the Vite root, which nobody knows yet at this point,
 * so `pwaAssetsPlugin` fills them in from its `config` hook.
 */
export function buildWebManifest(manifest: RootedApplicationManifest): Partial<ManifestOptions> {
	return {
		name: 'Rooted Template',
		short_name: 'template',
		description: 'Template @rooted/* application.',
		theme_color: '#ffffff',
		background_color: '#f8faf2',
		display: 'standalone',
		...manifest.webManifest,
	}
}

export type PwaOptions = {
	manifest: RootedApplicationManifest
	webManifest: Partial<ManifestOptions>
	skipPwaGenerator: boolean
	minify: boolean
	runtimeCaching: RuntimeCaching[] | undefined
	workerScripts: string[] | undefined
}
/**
 * The options handed to vite-plugin-pwa.
 * Split out from {@link pwaPreset} so the settings that decide how an update reaches the page can be asserted without booting Vite.
 */
export function pwaPresetOptions(
	{ manifest, webManifest, skipPwaGenerator, minify, runtimeCaching, workerScripts }: PwaOptions,
): Partial<VitePWAOptions> {
	return {
		// Utility for speeding up build times
		disable: skipPwaGenerator,
		// A new version never takes over the running page:
		// no `skipWaiting()`, no `clientsClaim()`, just the message listener workbox adds when skipWaiting is off.
		// So it activates when the browser lets it, once every window of the app is closed,
		// or when `applyUpdate` from `@rooted/pwa` sends that message.
		registerType: 'prompt',
		// rooted emits its own registration script, which also checks for updates while the app runs.
		// vite-plugin-pwa's `registerSW.js` only registers.
		injectRegister: false,
		filename: `worker.js`,
		minify,
		manifestFilename: `${manifest.webManifest.id}.webmanifest`,
		workbox: {
			sourcemap: !minify,
			navigateFallbackDenylist: [/\.\w+$/],
			runtimeCaching: [imageCacheEntry, ...(runtimeCaching ?? [])],
			// Workbox puts these at the very top of the worker, ahead of its own listeners.
			...(workerScripts && { importScripts: workerScripts }),
		},
		...(manifest.icon && {
			pwaAssets: {
				preset: 'minimal-2023',
				image: manifest.icon,
				overrideManifestIcons: true,
			},
		}),
		manifest: webManifest,
	}
}

export function pwaPreset(options: PwaOptions) {
	return VitePWA(pwaPresetOptions(options))
}
