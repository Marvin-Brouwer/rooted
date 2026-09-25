import { localeTokenBrand } from '../src/locale-token.mts'

import type { LocaleTokenInfo } from '../src/locale-token.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Constant, Parameter } from '@rooted/router/routes'

// Structural view of a route, matching what the manifest api exposes. The
// route objects come from a jiti-loaded module copy, so detection relies on
// shape and Symbol.for brands, never on module identity.
export type RouteLike = {
	getMetadata(): {
		routeParts: Array<string | object>
		staticPaths: false | readonly string[]
	}
}

export type LocaleToken = Parameter<'locale', Constant> & { [localeTokenBrand]: LocaleTokenInfo }

export function findLocaleToken(routeParts: Array<string | object>): LocaleToken | undefined {
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

/** Every distinct locale token used by the manifest's routes, one per localization instance. */
export function collectLocaleTokenInfos(manifestApi: RouteManifestApi | undefined): LocaleTokenInfo[] {
	const seen = new Set<LocaleToken>()

	for (const route of manifestApi?.routes ?? []) {
		if (!Object.hasOwn(route, 'getMetadata')) continue
		const localeToken = findLocaleToken((route as RouteLike).getMetadata().routeParts)
		if (localeToken) seen.add(localeToken)
	}

	return [...seen].map(localeToken => localeToken[localeTokenBrand])
}
