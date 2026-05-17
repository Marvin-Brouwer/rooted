import { defineConfig } from 'vitepress'

export default defineConfig({
	title: 'rooted',
	description: 'A TypeScript framework for web apps. Rooted in custom elements, typed end-to-end, batteries included.',
	base: '/rooted/',
	// Existing docs use relative links to source files and repo root that are valid on GitHub
	// but not resolvable in the VitePress build.
	ignoreDeadLinks: true,

	themeConfig: {
		nav: [
			{ text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
			{ text: 'Advanced', link: '/advanced/elements', activeMatch: '/advanced/' },
			{ text: 'Contributing', link: '/contributing/overview', activeMatch: '/contributing/' },
		],

		sidebar: [
			{
				text: 'Guide',
				items: [
					{ text: 'Getting started', link: '/guide/getting-started' },
					{ text: 'Application model', link: '/guide/application-model' },
					{ text: 'Components', link: '/guide/components' },
					{ text: 'Routing', link: '/guide/routing' },
					{ text: 'Styling', link: '/guide/styling' },
					{ text: 'State', link: '/guide/state' },
					{ text: 'Storage', link: '/guide/storage' },
					{ text: 'SEO', link: '/guide/seo' },
					{ text: 'Adapters', link: '/guide/adapters' },
					{ text: 'FAQ', link: '/guide/faq' },
				],
			},
			{
				text: 'Advanced',
				items: [
					{ text: 'Elements', link: '/advanced/elements' },
					{ text: 'Events', link: '/advanced/events' },
					{ text: 'Internals', link: '/advanced/internals' },
					{ text: 'Server middleware', link: '/advanced/server-middleware' },
				],
			},
			{
				text: 'Contributing',
				items: [
					{ text: 'Overview', link: '/contributing/overview' },
					{ text: 'Commits', link: '/contributing/commits' },
					{ text: 'Pull requests', link: '/contributing/pull-requests' },
				],
			},
			{
				text: 'Maintainers',
				items: [
					{ text: 'Coding style', link: '/maintainers/coding-style' },
					{ text: 'Package design', link: '/maintainers/package-design' },
					{ text: 'Adding packages', link: '/maintainers/adding-packages' },
				],
			},
		],

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/Marvin-Brouwer/rooted' },
		],
	},
})
