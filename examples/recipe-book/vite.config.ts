import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { generateRouteManifest } from '@rooted/router/manifest'
import matter from 'gray-matter'
import { marked } from 'marked'
import type { Plugin } from 'vite'

/**
 * Transforms `.md` files into plain JS modules at build time (Node.js context).
 * Frontmatter becomes enumerable properties; the markdown body becomes `html`.
 * No Node-specific APIs (Buffer, fs, …) reach the browser bundle.
 */
function markdownPlugin(): Plugin {
	return {
		name: 'rooted:markdown',
		transform(code, id) {
			if (!id.endsWith('.md')) return null
			const { data, content } = matter(code)
			const html = marked(content) as string
			return {
				code: `export default ${JSON.stringify({ ...data, html })}`,
				map: null,
			}
		},
	}
}

export default defineConfig({
	plugins: [
		markdownPlugin(),
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
