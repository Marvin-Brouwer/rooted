import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CodeSplittingGroups, rootedManifest } from '@rooted/application'
import { githubPagesAdapter } from '@rooted/application/adapters'
import { generateRouteManifest } from '@rooted/router/manifest'
import { varlockVitePlugin } from '@varlock/vite-integration'
import { ENV } from 'varlock/env'
import { normalizePath } from 'vite'

import packageJson from './package.json' with { type: 'json' }
import { markdownPlugin } from './plugins/markdown.mts'
import { responsiveImages } from './plugins/responsive-images.mts'

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
		description: 'A vertical-slice example app for @rooted/components',
		theme_color: '#ffffff',
		background_color: '#faf7f2',
		display: 'standalone',
	},

	seo: {
		llmsTxt: {
			intro: 'Recipe Book is a demo application built with the @rooted framework. It showcases client-side routing, lazy-loaded components, and responsive image handling.',
			sections: [
				{
					title: 'Recipes',
					entries: [
						{ title: 'Pasta Carbonara', url: `${packageJson.homepage}recipe/1/`, description: 'A classic Roman pasta with crispy guanciale, eggs, and Pecorino Romano — no cream required.' },
						{ title: 'Chicken Tikka Masala', url: `${packageJson.homepage}recipe/2/`, description: 'Tender marinated chicken in a rich, spiced tomato-cream sauce — a crowd-pleasing classic.' },
						{ title: 'Chocolate Lava Cake', url: `${packageJson.homepage}recipe/3/`, description: 'Individual molten chocolate cakes with a warm, flowing centre — stunning and surprisingly simple.' },
						{ title: 'Caesar Salad', url: `${packageJson.homepage}recipe/4/`, description: 'Crisp romaine lettuce with a punchy anchovy dressing, shaved Parmesan, and crunchy homemade croutons.' },
						{ title: 'Crispy Beef Tacos', url: `${packageJson.homepage}recipe/5/`, description: 'Seasoned ground beef with a zingy slaw, avocado, and pickled jalapeños in warm corn tortillas.' },
						{ title: 'Risotto alla Milanese', url: `${packageJson.homepage}recipe/6/`, description: 'The golden risotto of Milan — creamy arborio rice perfumed with saffron and finished with cold butter.' },
						{ title: 'Chicken Enchiladas Rojas', url: `${packageJson.homepage}recipe/7/`, description: 'Tender shredded chicken rolled in corn tortillas, smothered in a smoky red chilli sauce and baked under melted cheese.' },
						{ title: 'Crème Brûlée', url: `${packageJson.homepage}recipe/8/`, description: 'Silky vanilla custard baked low and slow, then crowned with a crackle of caramelised sugar.' },
						{ title: 'Sticky Toffee Pudding', url: `${packageJson.homepage}recipe/9/`, description: 'A deeply moist date sponge drenched in butterscotch toffee sauce — the ultimate British comfort dessert.' },
					],
				},
				{
					title: 'Browse by category',
					entries: [
						{ title: 'All categories', url: `${packageJson.homepage}categories/` },
						{ title: 'Italian', url: `${packageJson.homepage}categories/italian/` },
						{ title: 'Indian', url: `${packageJson.homepage}categories/indian/` },
						{ title: 'Mexican', url: `${packageJson.homepage}categories/mexican/` },
						{ title: 'Desserts', url: `${packageJson.homepage}categories/desserts/` },
						{ title: 'Salads', url: `${packageJson.homepage}categories/salads/` },
					],
				},
				{
					title: 'Other pages',
					entries: [
						{ title: 'Search', url: `${packageJson.homepage}search/`, description: 'Find recipes by keyword, category, or ingredient.' },
						{ title: 'Accessibility', url: `${packageJson.homepage}accessibility/`, description: 'Accessibility statement for the Rooted Recipe Book demo application.' },
						{ title: 'Privacy', url: `${packageJson.homepage}privacy/`, description: 'Privacy policy for the Rooted Recipe Book demo application.' },
						{ title: 'Content notice', url: `${packageJson.homepage}content-notice/`, description: 'About this demo application and the content it uses.' },
						{ title: 'Licenses', url: `${packageJson.homepage}licenses/`, description: 'Open source licenses used by the Rooted Recipe Book demo application.' },
					],
				},
			],
		},
	},

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
