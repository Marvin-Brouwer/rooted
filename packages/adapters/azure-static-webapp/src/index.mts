import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link azureStaticWebappAdapter}.
 */
export type AzureStaticWebappAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Adapter for Azure Static Web Apps.
 *
 * Writes `staticwebapp.config.json` to the output directory with routing rules
 * built from the route manifest and/or manual `routes` option:
 * - Pre-rendered routes get explicit `200` entries so Azure serves their HTML directly.
 * - Parameterized routes get wildcard rewrite entries (`:param` becomes `*`).
 * - Everything else falls through to `navigationFallback` pointing at `404.html`.
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
 *     azureStaticWebappAdapter(),
 *   ],
 * })
 * ```
 */
export function azureStaticWebappAdapter(options?: AzureStaticWebappAdapterOptions): Plugin {
	return staticAdapter({
		name: 'rooted:azure-static-webapp',
		routes: options?.routes,
		async setup({ outputDirectory, resolvedRoutes }) {
			const staticRoutes: AzureRoute[] = resolvedRoutes.staticPaths
				.filter(p => p.split('/').filter(Boolean).length > 0)
				.map(p => ({
					route: p,
					serve: `/${p.split('/').filter(Boolean).join('/')}/index.html`,
					statusCode: 200 as const,
				}))

			const dynamicRoutes: AzureRoute[] = resolvedRoutes.dynamicPatterns
				.map(p => ({ route: toWildcard(p).replace(/\/$/, '') + '/*', rewrite: '/404.html' }))

			const config: AzureStaticWebAppConfig = {
				routes: [...staticRoutes, ...dynamicRoutes],
				navigationFallback: {
					rewrite: '/404.html',
					exclude: ['/assets/*', '/*.{js,css,png,jpg,svg,ico,woff2,webmanifest}'],
				},
			}

			await writeFile(
				path.join(outputDirectory, 'staticwebapp.config.json'),
				JSON.stringify(config, undefined, 2),
				'utf8',
			)
		},
	})
}

type AzureRoute =
	| { route: string; serve: string; statusCode: 200 }
	| { route: string; rewrite: string }

type AzureStaticWebAppConfig = {
	routes: AzureRoute[]
	navigationFallback: { rewrite: string; exclude: string[] }
}

// Converts :param tokens to Azure wildcard (*) segments.
function toWildcard(pattern: string): string {
	return pattern.replace(/:[\w]+/g, '*')
}
