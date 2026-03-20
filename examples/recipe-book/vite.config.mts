import { normalizePath } from 'vite'
import { CodeSplittingGroups, rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { markdownPlugin } from './plugins/markdown.mjs'
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

const codeSplittingGroups: CodeSplittingGroups = [
	// Just make all markdown a separate chunk,
	// This is to illustrate it's not a part of the application bundle
	{
		name: 'content',
		entriesAware: false,
		test: (id) => id.endsWith('.md')
	},

	// In MONOREPO, chunk rootedDir source paths as if they were @rooted/*
	{ name: 'vendor/@rooted', test: (id) => id.startsWith(rootedDir) },
]

export default rootedManifest({
	webManifest: {
		id: 'rooted-recipe-book',
		name: 'Rooted Recipe Book',
		short_name: 'Recipe Book',
		description: 'A vertical-slice example app for @rooted/components',
		theme_color: '#ffffff',
		background_color: '#faf7f2',
		display: 'standalone',
	},

	plugins: [
		markdownPlugin(),
		generateRouteManifest({
			glob: './src/**/_routes.mts',
			root: './src/_routes.g.mts',
		}),
	],
	codeSplitting: {
		groups: codeSplittingGroups
	},

	// In MONOREPO, forward aliases @rooted/* to rootedDir source paths
	resolve: {
		alias: rootedAliases,
	},
})