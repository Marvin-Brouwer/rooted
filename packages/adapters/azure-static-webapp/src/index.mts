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
 * - Everything else returns a `404` response that serves `404.html`, matching the
 *   behaviour of GitHub Pages: the SPA shell loads and the client-side router takes over.
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

			const config: AzureStaticWebAppConfig = {
				routes: staticRoutes,
				responseOverrides: {
					404: { rewrite: '/404.html', statusCode: 404 },
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

type AzureRoute = { route: string; serve: string; statusCode: 200 }

type AzureStaticWebAppConfig = {
	routes: AzureRoute[]
	responseOverrides: { 404: { rewrite: string; statusCode: 404 } }
}
