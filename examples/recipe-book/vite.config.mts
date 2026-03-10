import { defineConfig, normalizePath } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { generateRouteManifest } from '@rooted/router/manifest'
import matter from 'gray-matter'
import { marked } from 'marked'
import type { Plugin } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootedDir = normalizePath(path.join(dirname(fileURLToPath(import.meta.resolve('@rooted/router'))), '../../'))
const manualChunks = (id: string) => {

	// Just make all markdown a separate chunk
	if (id.endsWith('.md')) return 'content+' + path.basename(id)

	// We will create some tooling later where this will be placed
	if (id.endsWith('.css?inline')) return 'css+' + path.basename(id)
	if (id.startsWith('@rooted')) return '@r'

	// PNPM monorepo doesn't remember @rooted apparently
	if (id.startsWith(rootedDir)) return '@r'
}
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
	appType: 'spa',
	dev: {
		sourcemap: true
	},
	build: {
		rollupOptions: {
			treeshake: 'smallest',
			output: {
				manualChunks
			}
		},
		target: 'esnext',
		cssMinify: 'esbuild',
		minify: 'terser',
	},
	esbuild: {
		sourcemap: 'external',
		minifyWhitespace: process.argv.includes('--minify'),
		treeShaking: true,
	},
	plugins: [
		markdownPlugin(),
		generateRouteManifest({
			glob: './src/**/_routes.mts',
			root: './src/_routes.g.mts',
		}),
		analyzer({
			analyzerMode: process.argv.includes('--analyze') ? 'server' : 'static',
			openAnalyzer: process.argv.includes('--analyze')
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

