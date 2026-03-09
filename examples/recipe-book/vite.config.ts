import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { generateRouteManifest } from '@rooted/router/manifest'

export default defineConfig({
	plugins: [
		generateRouteManifest({
			glob: './src/**/_gates.mts',
			root: './src/_routes.g.mts',
		}),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Rooted Recipe Book',
				short_name: 'Recipe Book',
				description: 'A vertical-slice example app for @rooted/components',
				theme_color: '#ffffff',
				background_color: '#faf7f2',
				display: 'standalone',
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
			},
		}),
	],
})
