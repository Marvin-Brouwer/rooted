import { describe, test, expect, vi } from 'vitest'

import { route } from '@rooted/router/routes'

import { routeSeoPlugin } from '../plugins/route-seo.mts'

import type { PageProvider, RouteSeoProvider, SeoPrepareTask } from '../plugins/seo-api.mts'
import type { ResolvedConfig } from 'vite'

type Registered = {
	seoProviders: RouteSeoProvider[]
	pageProviders: PageProvider[]
	prepareTasks: SeoPrepareTask[]
	warn: ReturnType<typeof vi.fn>
}

function setup(options: { routes?: unknown[], withManifest?: boolean, withSeo?: boolean } = {}): Registered {
	const { routes = [], withManifest = true, withSeo = true } = options

	const registered: Registered = {
		seoProviders: [],
		pageProviders: [],
		prepareTasks: [],
		warn: vi.fn(),
	}

	const manifestPlugin = {
		name: 'vite-plugin:generate-rooted-route-manifest',
		api: { routes, routeManifestPath: '', routeSourceFiles: new Map() },
	}
	const seoPlugin = {
		name: 'rooted:seo',
		api: {
			addRouteSeoProvider(p: RouteSeoProvider) { registered.seoProviders.push(p) },
			addPageProvider(p: PageProvider) { registered.pageProviders.push(p) },
			addPrepareTask(task: SeoPrepareTask) { registered.prepareTasks.push(task) },
		},
	}

	const fakeConfig = {
		root: process.cwd(),
		plugins: [
			...(withManifest ? [manifestPlugin] : []),
			...(withSeo ? [seoPlugin] : []),
		],
		logger: { warn: registered.warn },
	} as unknown as ResolvedConfig

	const plugin = routeSeoPlugin()
	;(plugin.configResolved as (config: ResolvedConfig) => void)(fakeConfig)

	return registered
}

describe('routeSeoPlugin()', () => {
	test('registers its seams when the manifest and seo plugins are both present', () => {
		// Arrange
		const aboutRoute = route`/about/`({ resolve: () => Promise.resolve(void 0), seo: { title: 'About' } })

		// Act
		const registered = setup({ routes: [aboutRoute] })

		// Assert
		expect(registered.seoProviders).toHaveLength(1)
		expect(registered.pageProviders).toHaveLength(1)
		expect(registered.prepareTasks).toHaveLength(1)
	})

	test('resolves route seo into the provider once prepare has run', async () => {
		// Arrange
		const aboutRoute = route`/about/`({ resolve: () => Promise.resolve(void 0), seo: { title: 'About' } })
		const registered = setup({ routes: [aboutRoute] })

		// Act
		for (const task of registered.prepareTasks) await task()

		// Assert
		expect(registered.seoProviders[0]!('/about/')).toEqual({ title: 'About' })
	})

	test('reports static paths as pages', async () => {
		// Arrange
		const aboutRoute = route`/about/`({ resolve: () => Promise.resolve(void 0), seo: { title: 'About' } })
		const registered = setup({ routes: [aboutRoute] })

		// Act
		for (const task of registered.prepareTasks) await task()
		const pages = await registered.pageProviders[0]!()

		// Assert
		expect(pages.map(page => page.path)).toEqual(['/about/'])
	})

	test('reports routes marked excludeFromSitemap, flagged rather than dropped', async () => {
		// Arrange
		const hiddenRoute = route`/hidden/`({
			resolve: () => Promise.resolve(void 0),
			seo: { title: 'Hidden', excludeFromSitemap: true },
		})
		const registered = setup({ routes: [hiddenRoute] })

		// Act
		for (const task of registered.prepareTasks) await task()
		const pages = await registered.pageProviders[0]!()

		// Assert
		// `llms.txt` lists these even though `sitemap.xml` skips them, so the page
		// has to survive the seam with the flag attached.
		expect(pages.map(page => page.path)).toEqual(['/hidden/'])
		expect(pages[0]!.excludeFromSitemap).toBe(true)
		expect(registered.seoProviders[0]!('/hidden/')).toEqual({ title: 'Hidden', excludeFromSitemap: true })
	})

	test('stays quiet when there is no manifest plugin', () => {
		// Arrange, Act
		const registered = setup({ withManifest: false })

		// Assert
		// An app without routing is a normal setup, so this must not warn.
		expect(registered.warn).not.toHaveBeenCalled()
		expect(registered.seoProviders).toHaveLength(0)
		expect(registered.prepareTasks).toHaveLength(0)
	})

	test('stays quiet when there is no seo plugin', () => {
		// Arrange, Act
		const registered = setup({ withSeo: false })

		// Assert
		expect(registered.warn).not.toHaveBeenCalled()
		expect(registered.pageProviders).toHaveLength(0)
	})
})
