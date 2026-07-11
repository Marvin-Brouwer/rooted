import { describe, test, expect } from 'vitest'

import { route } from '@rooted/router/routes'

import { localizationSeo } from '../plugins/hreflang.mts'
import { dictionary } from '../src/dictionary.mts'
import { configureLocalization } from '../src/localization.mts'

import type { RouteHeadLink, RouteHeadLinkProvider } from '@rooted/adapter'
import type { ResolvedConfig } from 'vite'

const localization = configureLocalization({
	default: 'en-GB',
	dictionaries: [dictionary('nl-NL', [])],
})

function setup(routes: unknown[]): RouteHeadLinkProvider {
	let provider: RouteHeadLinkProvider | undefined

	const fakeConfig = {
		plugins: [
			{
				name: 'vite-plugin:generate-rooted-route-manifest',
				api: { routes, routeManifestPath: '', routeSourceFiles: new Map() },
			},
			{
				name: 'rooted:seo',
				api: { addRouteHeadLinks(p: RouteHeadLinkProvider) { provider = p } },
			},
		],
	} as unknown as ResolvedConfig

	const plugin = localizationSeo()
	const hook = plugin.configResolved as (config: ResolvedConfig) => void
	hook(fakeConfig)

	if (!provider) throw new Error('provider was not registered')
	return provider
}

function byHreflang(links: RouteHeadLink[] | undefined, hreflang: string) {
	return links?.find(link => link.hreflang === hreflang)
}

describe('localizationSeo()', () => {
	test('provides alternate links for every locale variant of a localized route', () => {
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		const provider = setup([aboutRoute])

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
		const provider = setup([contactRoute])

		expect(byHreflang(provider('/nl-NL/contact/'), 'en-GB')?.path).toBe('/en-GB/contact/')
	})

	test('returns undefined for paths without a localized route', () => {
		const aboutRoute = route`/${localization.parameter}/about/`({ resolve: () => Promise.resolve(void 0) })
		const plainRoute = route`/plain/`({ resolve: () => Promise.resolve(void 0) })
		const provider = setup([aboutRoute, plainRoute])

		expect(provider('/plain/')).toBeUndefined()
		expect(provider('/unknown/')).toBeUndefined()
	})

	test('skips routes without a locale token', () => {
		const plainRoute = route`/plain/`({ resolve: () => Promise.resolve(void 0) })
		const provider = setup([plainRoute])

		expect(provider('/plain/')).toBeUndefined()
	})
})
