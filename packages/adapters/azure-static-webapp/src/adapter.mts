import { Buffer } from 'node:buffer'
import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { catchAllPrefixes, staticAdapter } from '@rooted/adapter'

import { buildAzureRoutes } from './adapter/routes.mts'

import type { AzureRoute } from './adapter/routes.mts'
import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * What Azure answers for a `:param` route. There's no default, because both are wrong somewhere,
 * and which one hurts less depends on your site. See {@link azureStaticWebappAdapter}.
 */
export type AzureDynamicRoutes = 'not-found' | 'catch-all'

/**
 * Options for {@link azureStaticWebappAdapter}.
 */
export type AzureStaticWebappAdapterOptions = {
	/**
	 * What Azure answers for a `:param` route. Required, see {@link azureStaticWebappAdapter} for the trade-off.
	 *
	 * - `'not-found'`: real dynamic pages answer `404`. Every status for a path that isn't a route is right.
	 * - `'catch-all'`: real dynamic pages answer `200`, and so does anything deeper under the same prefix.
	 */
	dynamicRoutes: AzureDynamicRoutes
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Adapter for Azure Static Web Apps.
 *
 * Writes `staticwebapp.config.json` to the output directory. Pre-rendered pages are plain files, which Azure serves with a `200` on its own,
 * and a path that doesn't resolve gets `404.html` with a real `404`.
 *
 * Azure can't match a `:param` route exactly. A wildcard is only allowed at the end of a rule and there's no per-segment match,
 * so there's no rule that means "`/recipe/` plus exactly one segment". You have to pick which way it's wrong:
 *
 * **`'not-found'`** writes no rule for dynamic routes.
 * - `/recipe/42/` serves the shell with a `404`. The page renders, because the browser-side router takes over, but crawlers drop it.
 *   If your dynamic pages are content you want found, that's most of your site gone from search.
 * - Everything that isn't a route answers `404`, so there are no soft 404s.
 *
 * **`'catch-all'`** writes `/recipe/*` for `/recipe/:id/`, cut at the first `:param`.
 * - `/recipe/42/` answers `200`.
 * - So does `/recipe/42/extra/`, which isn't a route. The browser-side router renders your not-found page with a `200`.
 *   Nothing links there, so crawlers rarely see it, but it's a soft 404 when they do.
 * - A route that starts with a `:param`, like `/:slug/`, becomes `/*`: every unknown path on the site answers `200`. The build warns when that happens.
 * - Azure checks rules before files, so every real file under a wildcard gets a rule of its own to stay reachable.
 *   With `/*` that's every file in the build, and Azure caps the config at 20 KB. The build fails if it goes over.
 *
 * `vite dev` and `vite preview` answer the same way as the option you pick.
 * Neither option gives an exact answer. For that you need something that runs the route matching itself, like `@rooted-adapters/fastify`.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 * import { azureStaticWebappAdapter } from '@rooted-adapters/azure-static-webapp'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     // Recipe pages should be indexed; a 200 on /recipe/42/extra/ is the price.
 *     azureStaticWebappAdapter({ dynamicRoutes: 'catch-all' }),
 *   ],
 * })
 * ```
 */
export function azureStaticWebappAdapter(options: AzureStaticWebappAdapterOptions): Plugin[] {
	const dynamicRoutes = requireDynamicRoutes(options)

	return staticAdapter({
		name: 'rooted:azure-static-webapp',
		routes: options.routes,
		dynamicRoutes,
		async setup({ config, outputDirectory, resolvedRoutes }) {
			const routes = dynamicRoutes === 'catch-all'
				? buildAzureRoutes(resolvedRoutes, await listFiles(outputDirectory), '404.html')
				: []

			if (dynamicRoutes === 'catch-all' && catchAllPrefixes(resolvedRoutes.dynamicPatterns).includes('/')) {
				config.logger.warn(
					'[rooted:azure-static-webapp] a route starts with a :param, so the catch-all rule is /*. '
					+ 'Every unknown path on the site now answers 200.',
				)
			}

			const azureConfig: AzureStaticWebAppConfig = {
				routes,
				trailingSlash: 'auto',
				responseOverrides: {
					404: { rewrite: '/404.html', statusCode: 404 },
				},
			}

			const contents = JSON.stringify(azureConfig, undefined, 2)
			const size = Buffer.byteLength(contents, 'utf8')
			if (size > maxConfigSize) {
				throw new Error(
					`[rooted:azure-static-webapp] staticwebapp.config.json is ${size} bytes, over Azure's limit of ${maxConfigSize}. `
					+ 'Every file under a catch-all prefix needs its own rule, '
					+ 'and a route that starts with a :param (like /:slug/) puts every file in the build under it.',
				)
			}

			await writeFile(path.join(outputDirectory, 'staticwebapp.config.json'), contents, 'utf8')
		},
	})
}

// Azure's documented maximum for staticwebapp.config.json.
const maxConfigSize = 20 * 1024

type AzureStaticWebAppConfig = {
	routes: AzureRoute[]
	trailingSlash: 'always' | 'never' | 'auto'
	responseOverrides: { 404: { rewrite: string; statusCode: 404 } }
}

// The type already requires it, this is for config written in plain JS.
function requireDynamicRoutes(options: AzureStaticWebappAdapterOptions | undefined): AzureDynamicRoutes {
	const value = options?.dynamicRoutes
	if (value === 'not-found' || value === 'catch-all') return value
	throw new Error(
		`[rooted:azure-static-webapp] dynamicRoutes is required, and has to be 'not-found' or 'catch-all' (got ${JSON.stringify(value)}). `
		+ 'Azure can\'t match a :param route exactly, so pick which way it\'s wrong: '
		+ '\'not-found\' answers 404 on real dynamic pages, \'catch-all\' answers 200 on paths below them that aren\'t routes.',
	)
}

/** Every file in the output directory, relative to it and with `/` separators. */
async function listFiles(outputDirectory: string): Promise<string[]> {
	const entries = await readdir(outputDirectory, { recursive: true, withFileTypes: true })
	return entries
		.filter(entry => entry.isFile())
		.map(entry => path.relative(outputDirectory, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
}
