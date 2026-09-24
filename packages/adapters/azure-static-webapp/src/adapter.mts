import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import { buildAzureRoutes } from './adapter/routes.mts'

import type { AzureRoute } from './adapter/routes.mts'
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
 * Writes `staticwebapp.config.json` to the output directory. Pre-rendered pages are plain files, which Azure serves with a `200` on its own.
 * Each `:param` route gets a rewrite to `404.html` that answers `200`, so `/recipe/42/` serves the shell and the browser-side router renders it.
 * Anything else falls through to the `404` override, which serves `404.html` with a real `404`.
 *
 * Azure only supports a wildcard at the end of a route, so `/recipe/:id/` is written as `/recipe/*`. That has a cost:
 * - `/recipe/42/extra/` answers `200` on Azure, where `vite dev` and `vite preview` answer `404`. The page still renders your not-found view.
 * - A route that starts with a `:param`, like `/:slug/`, becomes `/*`, and every unknown path answers `200`.
 *
 * Real files under a wildcard's prefix get their own rule so the wildcard doesn't hide them.
 * With a `/*` that's every file in the build, and Azure caps the config at 20 KB, so a large enough build fails here rather than at deploy time.
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
export function azureStaticWebappAdapter(options?: AzureStaticWebappAdapterOptions): Plugin[] {
	return staticAdapter({
		name: 'rooted:azure-static-webapp',
		routes: options?.routes,
		// The wildcard rewrites below are what Azure matches :param routes with.
		dynamicRoutes: 'routed',
		async setup({ outputDirectory, resolvedRoutes }) {
			const outputFiles = await listFiles(outputDirectory)

			const config: AzureStaticWebAppConfig = {
				routes: buildAzureRoutes(resolvedRoutes, outputFiles, '404.html'),
				trailingSlash: 'auto',
				responseOverrides: {
					404: { rewrite: '/404.html', statusCode: 404 },
				},
			}

			const contents = JSON.stringify(config, undefined, 2)
			const size = Buffer.byteLength(contents, 'utf8')
			if (size > maxConfigSize) {
				throw new Error(
					`staticwebapp.config.json is ${size} bytes, over Azure's limit of ${maxConfigSize}. `
					+ 'Every file under a :param route\'s prefix needs its own rule, '
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

/** Every file in the output directory, relative to it and with `/` separators. */
async function listFiles(outputDirectory: string): Promise<string[]> {
	const entries = await readdir(outputDirectory, { recursive: true, withFileTypes: true })
	return entries
		.filter(entry => entry.isFile())
		.map(entry => path.relative(outputDirectory, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
}
