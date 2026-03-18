import { defineConfig, normalizePath } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { generateRouteManifest } from '@rooted/router/manifest'
import { cssLoader } from '@rooted/components/css-loader'
import matter from 'gray-matter'
import { marked } from 'marked'
import type { Plugin } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootedDir = normalizePath(path.join(dirname(fileURLToPath(import.meta.resolve('@rooted/router'))), '../../'))

/**
 * Aliases `@rooted/*` to the dist files in the monorepo.
 * Without this, PNPM can resolve the same package via both its bare specifier and its
 * real file path, causing two module instances and duplicate component warnings.
 * Subpath regex must come before the bare-package regex.
 */
const rootedAliases = [
	{ find: /^@rooted\/([^/]+)\/([^/]+)$/, replacement: `${rootedDir}/$1/dist/$2.mjs` },
	{ find: /^@rooted\/([^/]+)$/, replacement: `${rootedDir}/$1/dist/$1.mjs` },
]

const mangle = !process.argv.includes('--no-mangle')
const manualChunks = (id: string) => {
	// Just make all markdown a separate chunk
	if (id.endsWith('.md')) return 'content/' + path.basename(id)

	// Chunk shared if not imported correctly
	if (id.includes('_shared/')) return 'shared/' + path.basename(id)

	// TODO We will create some tooling later where this will be placed
	if (id.startsWith('@rooted')) return 'vendor/@rooted'

	// In monorepo, forward aliases rewrite @rooted/* to rootedDir source paths
	if (id.startsWith(rootedDir)) return 'vendor/@rooted'
}
/**
 * Transforms `.md` files into plain JS modules at build time (Node.js context).
 * Frontmatter becomes enumerable properties; the markdown body becomes `html`.
 * No Node-specific APIs (Buffer, fs, …) reach the browser bundle.
 */
function markdownPlugin(): Plugin {
	return {
		name: 'vite-plugin:markdown',
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

const appId = 'rooted-recipe-book'
export default defineConfig({
	appType: 'spa',
	resolve: {
		alias: rootedAliases,
	},
	dev: {
		sourcemap: true
	},
	build: {
		rollupOptions: {
			treeshake: 'smallest',
			output: {
				manualChunks,
				...(mangle && {
					entryFileNames: '[hash].js',
					chunkFileNames: '[hash].js',
					assetFileNames: '[hash][extname]',
				})
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
		cssLoader({
			minify: process.argv.includes('--minify')
		}),
		analyzer({
			analyzerMode: process.argv.includes('--analyze') ? 'server' : 'static',
			openAnalyzer: process.argv.includes('--analyze')
		}),
		VitePWA({
			disable: process.argv.includes('--no-pwa'),
			registerType: 'autoUpdate',
			filename: `worker.js`,
			minify: process.argv.includes('--minify'),
			manifestFilename: `${appId}.webmanifest`,
			workbox: {
				sourcemap: !process.argv.includes('--minify'),
			},
			manifest: {
				id: appId,
				name: 'Rooted Recipe Book',
				short_name: 'Recipe Book',
				description: 'A vertical-slice example app for @rooted/components',
				theme_color: '#ffffff',
				background_color: '#faf7f2',
				display: 'standalone',
				// TODO generate based on svg using svgo
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

