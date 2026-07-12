import { describe, test, expect, vi } from 'vitest'

import { route } from '@rooted/router/routes'

import { localizationSeo } from '../plugins/hreflang.mts'
import { dictionary } from '../src/dictionary.mts'
import { configureLocalization } from '../src/localization.mts'

import type { RouteHeadLink, RouteHeadLinkProvider, RouteHtmlTransform, SeoPrepareTask } from '@rooted/adapter'
import type { ResolvedConfig } from 'vite'

const localization = configureLocalization({
	default: 'en-GB',
	dictionaries: { 'nl-NL': () => Promise.resolve({ default: dictionary() }) },
})

type Registered = {
	provider: RouteHeadLinkProvider
	transform: RouteHtmlTransform
	prepareTasks: SeoPrepareTask[]
}

function setup(routes: unknown[]): Registered {
	let provider: RouteHeadLinkProvider | undefined
	let transform: RouteHtmlTransform | undefined
	const prepareTasks: SeoPrepareTask[] = []

	const fakeConfig = {
		plugins: [
			{
				name: 'vite-plugin:generate-rooted-route-manifest',
				api: { routes, routeManifestPath: '', routeSourceFiles: new Map() },
			},
			{
				name: 'rooted:seo',
				api: {
					addRouteHeadLinks(p: RouteHeadLinkProvider) { provider = p },
					addRouteHtmlTransform(t: RouteHtmlTransform) { transform = t },
					addPrepareTask(task: SeoPrepareTask) { prepareTasks.push(task) },
				},
			},
		],
	} as unknown as ResolvedConfig

	const plugin = localizationSeo()
	const hook = plugin.configResolved as (config: ResolvedConfig) => void
	hook(fakeConfig)

	if (!provider || !transform) throw new Error('provider or transform was not registered')
	return { provider, transform, prepareTasks }
}

function byHreflang(links: RouteHeadLink[] | undefined, hreflang: string) {
	return links?.find(link => link.hreflang === hreflang)
}

const shell = '<html><head><title>x</title>\n</head><body></body></html>'

describe('localizationSeo()', () => {
	test('provides alternate links for every locale variant of a localized route', () => {
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		const { provider } = setup([aboutRoute])

		const links = provider('/nl-NL/about/')
		expect(links).toHaveLength(3)
		expect(byHreflang(links, 'en-GB')?.path).toBe('/en-GB/about/')
		expect(byHreflang(links, 'nl-NL')?.path).toBe('/nl-NL/about/')
		expect(byHreflang(links, 'x-default')?.path).toBe('/en-GB/about/')

		// Both locale variants of the same route resolve to the same alternates
		expect(provider('/en-GB/about/')).toEqual(links)
	})

	test('resolves the locale token through a parent route', () => {
		const homeRoute = route`/${localization.parameter}/`({ resolve: () => Promise.resolve(void 0) })
		const contactRoute = route`/${homeRoute}/contact/`({ resolve: () => Promise.resolve(void 0) })
		const { provider } = setup([contactRoute])

		expect(byHreflang(provider('/nl-NL/contact/'), 'en-GB')?.path).toBe('/en-GB/contact/')
	})

	test('returns undefined for paths without a localized route', () => {
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		const plainRoute = route`/plain/`({ resolve: () => Promise.resolve(void 0) })
		const { provider } = setup([aboutRoute, plainRoute])

		expect(provider('/plain/')).toBeUndefined()
		expect(provider('/unknown/')).toBeUndefined()
	})

	test('skips routes without a locale token', () => {
		const plainRoute = route`/plain/`({ resolve: () => Promise.resolve(void 0) })
		const { provider } = setup([plainRoute])

		expect(provider('/plain/')).toBeUndefined()
	})

	test('the prepare task loads every configured dictionary', async () => {
		const nlLoader = vi.fn(() => Promise.resolve({ default: dictionary() }))
		const scoped = configureLocalization({
			default: 'en-GB',
			dictionaries: { 'nl-NL': nlLoader },
		})
		const aboutRoute = route`/${scoped.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		const { prepareTasks } = setup([aboutRoute])

		expect(prepareTasks).toHaveLength(1)
		await prepareTasks[0]()
		expect(nlLoader).toHaveBeenCalledOnce()
	})

	test('the html transform sets the lang attribute per variant', () => {
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		const { transform } = setup([aboutRoute])

		expect(transform(shell, '/nl-NL/about/')).toContain('<html lang="nl-NL">')
		expect(transform(shell, '/en-GB/about/')).toContain('<html lang="en-GB">')
	})

	test('the html transform replaces an existing lang attribute', () => {
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		const { transform } = setup([aboutRoute])

		const withLang = shell.replace('<html>', '<html lang="en">')
		expect(transform(withLang, '/nl-NL/about/')).toContain('<html lang="nl-NL">')
	})

	test('the html transform injects og:locale and alternates', () => {
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		const { transform } = setup([aboutRoute])

		const result = transform(shell, '/nl-NL/about/')
		expect(result).toContain('<meta property="og:locale" content="nl_NL" />')
		expect(result).toContain('<meta property="og:locale:alternate" content="en_GB" />')
	})

	test('the html transform leaves non-localized paths alone', () => {
		const plainRoute = route`/plain/`({ resolve: () => Promise.resolve(void 0) })
		const { transform } = setup([plainRoute])

		expect(transform(shell, '/plain/')).toBe(shell)
	})
})
