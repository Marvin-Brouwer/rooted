import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { varlockVitePlugin } from '@varlock/vite-integration'
import { ENV } from 'varlock/env'
import { normalizePath } from 'vite'

import { CodeSplittingGroups, rootedManifest } from '@rooted/application'
import { githubPagesAdapter } from '@rooted/application/adapters'
import { generateRouteManifest } from '@rooted/router/manifest'

import packageJson from './package.json' with { type: 'json' }
import { markdownPlugin } from './plugins/markdown.mts'
import { responsiveImages } from './plugins/responsive-images.mts'
import { seo } from './src/seo.mts'

const rootedDirectory = normalizePath(path.join(path.dirname(fileURLToPath(import.meta.resolve('@rooted/router'))), '../../'))

/**
 * Aliases `@rooted/*` to the dist files in the monorepo.
 * Without this, PNPM can resolve the same package via both its bare specifier and its
 * real file path, causing two module instances and duplicate component warnings.
 * Subpath regex must come before the bare-package regex.
 */
const rootedAliases = [
	{ find: /^@rooted\/([^/]+)\/([^/]+)$/, replacement: `${rootedDirectory}/$1/dist/$2.mjs` },
	{ find: /^@rooted\/([^/]+)$/, replacement: `${rootedDirectory}/$1/dist/$1.mjs` },
]

const codeSplittingGroups: CodeSplittingGroups = [
	// Just make all markdown a separate chunk,
	// This is to illustrate it's not a part of the application bundle
	{
		name: 'content',
		entriesAware: false,
		test: id => id.endsWith('.md'),
	},

	// In MONOREPO, chunk rootedDirectory source paths as if they were @rooted/*
	{ name: 'vendor/@rooted', test: id => id.startsWith(rootedDirectory) },
]

export default rootedManifest({
	webManifest: {
		id: 'rooted-recipe-book',
		url: packageJson.homepage,
		name: 'Rooted Recipe Book',
		short_name: 'Recipe Book',
		description: 'An example app for the @rooted/* framework',
		theme_color: '#ffffff',
		background_color: '#faf7f2',
		display: 'standalone',
	},

	seo,

	plugins: [
		varlockVitePlugin(),
		responsiveImages({ accessKey: ENV.UNSPLASH_ACCESS_KEY, deploymentUrl: packageJson.homepage }),
		markdownPlugin(),
		generateRouteManifest({
			glob: './src/**/_routes.mts',
			routeManifestPath: './src/_routes.g.mts',
		}),
		githubPagesAdapter(),
	],
	codeSplitting: {
		groups: codeSplittingGroups,
	},

	// In MONOREPO, forward aliases @rooted/* to rootedDirectory source paths
	resolve: {
		alias: rootedAliases,
	},
})
