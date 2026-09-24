import { catchAllPrefixes, withTrailingSlash } from '@rooted/adapter'

import type { ResolvedAdapterRoutes } from '@rooted/adapter'

/** One entry in the `routes` array of `staticwebapp.config.json`. */
export type AzureRoute = { route: string; rewrite?: string }

const configFileName = 'staticwebapp.config.json'

/**
 * Builds the `routes` array for `staticwebapp.config.json`.
 *
 * Azure only supports a wildcard at the end of a route, so a dynamic pattern can't be matched per segment.
 * Each pattern is cut at its first `:param` and becomes a `<prefix>*` rule that rewrites to the fallback file, which answers `200`.
 * That over-matches: `/recipe/:id/` becomes `/recipe/*`, so `/recipe/42/extra/` answers `200` too, and the browser-side router renders not-found.
 * A pattern that starts with a `:param` becomes `/*`, which turns every unknown path into a soft 404.
 *
 * Azure applies route rules before it looks for a file, so a wildcard would also swallow the real files under its prefix.
 * Every output file and pre-rendered page under a prefix gets a rule with no action ahead of the wildcards. Rules are first-match,
 * so that stops evaluation and Azure serves the file as usual. Pages are listed as their `index.html`, because Azure matches that rule for the folder too.
 * They're passed in as static paths rather than files, since the adapter runs before the pages are written.
 *
 * @example
 * ```ts
 * buildAzureRoutes(
 *   { staticPaths: ['/recipe/new/', '/about/'], dynamicPatterns: ['/recipe/:id/', '/recipe/:id/ingredients/'] },
 *   ['recipe/photo.jpg', 'assets/index.js'],
 *   '404.html',
 * )
 * // [
 * //   { route: '/recipe/photo.jpg' },
 * //   { route: '/recipe/new/index.html' },
 * //   { route: '/recipe/*', rewrite: '/404.html' },
 * // ]
 * ```
 */
export function buildAzureRoutes(
	routes: ResolvedAdapterRoutes,
	outputFiles: string[],
	fallbackFileName: string,
): AzureRoute[] {
	const prefixes = catchAllPrefixes(routes.dynamicPatterns)

	const files = [
		...outputFiles.map(file => `/${file}`).filter(file => file !== `/${configFileName}`),
		...routes.staticPaths.map(staticPath => `${withTrailingSlash(staticPath)}index.html`),
	]
	const passThrough: AzureRoute[] = [...new Set(files)]
		.filter(file => prefixes.some(prefix => file.startsWith(prefix)))
		.map(file => ({ route: file }))

	const wildcards: AzureRoute[] = prefixes
		.map(prefix => ({ route: `${prefix}*`, rewrite: `/${fallbackFileName}` }))

	return [...passThrough, ...wildcards]
}
