import { isConstantParameter } from '@rooted/router/routes'

import { localeTokenBrand } from '../src/locale-token.mts'

import type { LocaleTokenInfo } from '../src/locale-token.mts'
import type { RouteHeadLink, SeoApi } from '@rooted/adapter'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Constant, Parameter } from '@rooted/router/routes'
import type { Plugin } from 'vite'

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'
const SEO_PLUGIN_NAME = 'rooted:seo'

// Structural view of a route, matching what the manifest api exposes. The
// route objects come from a jiti-loaded module copy, so detection relies on
// shape and Symbol.for brands, never on module identity.
type RouteLike = {
	getMetadata(): {
		routeParts: Array<string | object>
		staticPaths: false | readonly string[]
	}
}

type LocaleToken = Parameter<'locale', Constant> & { [localeTokenBrand]: LocaleTokenInfo }

type LocalizedVariant = {
	locale: string
	defaultLocale: string
	locales: readonly string[]
	links: RouteHeadLink[]
}

/**
 * Wires localized routes into the rooted SEO plugin.
 *
 * For every route composed with `localization.parameter`, each prerendered
 * locale variant gets:
 * - one `<link rel="alternate" hreflang>` per configured locale plus an
 *   `x-default` pointing at the default locale,
 * - a `lang` attribute on the `<html>` tag,
 * - `og:locale` and `og:locale:alternate` meta tags.
 *
 * It also preloads every locale's dictionary before the build evaluates lazy
 * seo resolvers, so `localization.text` inside `seo: () => ({ ... })` comes
 * out translated per page. Everything is read straight off the branded
 * locale token, so the plugin needs no options.
 *
 * Add it to the Vite plugins next to `generateRouteManifest` and the adapter:
 * ```ts
 * import { localizationSeo } from '@rooted/localization/vite'
 *
 * plugins: [generateRouteManifest({ ... }), localizationSeo(), myAdapter()]
 * ```
 *
 * This only covers prerendered HTML. The live document is handled by
 * `localization.observeDocument` at runtime; use both.
 */
export function localizationSeo(): Plugin {
	let manifestApi: RouteManifestApi | undefined
	let index: Map<string, LocalizedVariant> | undefined

	function variants(): Map<string, LocalizedVariant> {
		return index ??= buildVariantIndex(manifestApi)
	}

	return {
		name: 'rooted:localization-seo',
		apply: 'build',

		configResolved(config) {
			const manifestPlugin = config.plugins.find(plugin => plugin.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
			const seoPlugin = config.plugins.find(plugin => plugin.name === SEO_PLUGIN_NAME)
			const seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api

			// Everything below runs lazily during the adapter's closeBundle,
			// safely after the manifest plugin loaded the routes in buildStart.

			// Preload every dictionary before lazy seo resolvers are evaluated
			seoApi?.addPrepareTask(async () => {
				for (const info of collectLocaleTokenInfos(manifestApi)) {
					for (const locale of info.locales) await info.load(locale)
				}
			})

			seoApi?.addRouteHeadLinks(staticPath => variants().get(staticPath)?.links)

			// Per-variant lang attribute and og:locale meta tags
			seoApi?.addRouteHtmlTransform((html, staticPath) => {
				const variant = variants().get(staticPath)
				if (!variant) return html
				return injectOgLocales(setHtmlLang(html, variant.locale), variant)
			})
		},
	}
}

function buildVariantIndex(manifestApi: RouteManifestApi | undefined): Map<string, LocalizedVariant> {
	const index = new Map<string, LocalizedVariant>()

	for (const route of manifestApi?.routes ?? []) {
		if (!Object.hasOwn(route, 'getMetadata')) continue
		const metadata = (route as RouteLike).getMetadata()
		if (metadata.staticPaths === false) continue

		const localeToken = findLocaleToken(metadata.routeParts)
		if (!localeToken) continue
		const { defaultLocale, locales } = localeToken[localeTokenBrand]

		// Enumerating with the locale pinned keeps the order of the other parts
		// stable, so paths at the same position are alternates of one another.
		const pathsByLocale = locales.map(locale => enumeratePaths(metadata.routeParts, locale))
		if (pathsByLocale.some(paths => paths === false)) continue

		const variantCount = (pathsByLocale[0] as string[]).length
		const defaultIndex = Math.max(locales.indexOf(defaultLocale), 0)

		for (let variant = 0; variant < variantCount; variant++) {
			const links: RouteHeadLink[] = locales.map((locale, localeIndex) => ({
				rel: 'alternate',
				hreflang: locale,
				path: (pathsByLocale[localeIndex] as string[])[variant],
			}))
			links.push({
				rel: 'alternate',
				hreflang: 'x-default',
				path: (pathsByLocale[defaultIndex] as string[])[variant],
			})

			for (let localeIndex = 0; localeIndex < locales.length; localeIndex++) {
				index.set((pathsByLocale[localeIndex] as string[])[variant], {
					locale: locales[localeIndex],
					defaultLocale,
					locales,
					links,
				})
			}
		}
	}

	return index
}

function collectLocaleTokenInfos(manifestApi: RouteManifestApi | undefined): LocaleTokenInfo[] {
	const seen = new Set<LocaleToken>()

	for (const route of manifestApi?.routes ?? []) {
		if (!Object.hasOwn(route, 'getMetadata')) continue
		const localeToken = findLocaleToken((route as RouteLike).getMetadata().routeParts)
		if (localeToken) seen.add(localeToken)
	}

	return [...seen].map(localeToken => localeToken[localeTokenBrand])
}

function setHtmlLang(html: string, locale: string): string {
	return html.replace(/<html([^>]*)>/i, (tag, attributes: string) => {
		if (/\slang=["'][^"']*["']/i.test(attributes)) {
			return `<html${attributes.replace(/\slang=["'][^"']*["']/i, ` lang="${locale}"`)}>`
		}
		return `<html lang="${locale}"${attributes}>`
	})
}

// The og format uses an underscore: nl-NL becomes nl_NL
function toOgLocale(locale: string): string {
	return locale.replaceAll('-', '_')
}

function injectOgLocales(html: string, variant: LocalizedVariant): string {
	if (/<meta[^>]+property=["']og:locale["']/i.test(html)) return html

	const tags = [`\t<meta property="og:locale" content="${toOgLocale(variant.locale)}" />`]
	for (const locale of variant.locales) {
		if (locale === variant.locale) continue
		tags.push(`\t<meta property="og:locale:alternate" content="${toOgLocale(locale)}" />`)
	}

	return html.replace('</head>', `${tags.join('\n')}\n</head>`)
}

function findLocaleToken(routeParts: Array<string | object>): LocaleToken | undefined {
	for (const part of routeParts) {
		if (typeof part === 'string') continue
		if (Object.hasOwn(part, 'getMetadata')) {
			const found = findLocaleToken((part as RouteLike).getMetadata().routeParts)
			if (found) return found
			continue
		}
		if (localeTokenBrand in part) return part as LocaleToken
	}
	return undefined
}

// Mirrors the router's staticPaths unrolling, with locale tokens pinned to a
// single value instead of unrolled.
function enumeratePaths(routeParts: Array<string | object>, pinnedLocale: string): false | string[] {
	let paths = ['']

	for (const part of routeParts) {
		if (typeof part === 'string') {
			paths = paths.map(path => path + part)
			continue
		}
		if (Object.hasOwn(part, 'getMetadata')) {
			const parentPaths = enumeratePaths((part as RouteLike).getMetadata().routeParts, pinnedLocale)
			if (parentPaths === false) return false
			paths = paths.flatMap(path => parentPaths.map(parentPath => path + parentPath))
			continue
		}
		if (localeTokenBrand in part) {
			paths = paths.map(path => path + pinnedLocale)
			continue
		}
		if (isConstantParameter(part as Parameter)) {
			const constantValues = (part as Parameter).type as Constant
			paths = paths.flatMap(path => constantValues.map(value => path + String(value)))
			continue
		}
		return false
	}

	return paths
}
