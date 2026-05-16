import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

/**
 * Adapter for Azure Static Web Apps.
 *
 * Writes `staticwebapp.config.json` to the output directory with routing rules
 * built from the route manifest:
 * - Pre-rendered routes get explicit `200` entries so Azure serves their HTML directly.
 * - Parameterized routes get wildcard rewrite entries (`:param` becomes `*`).
 * - Everything else falls through to `navigationFallback` pointing at `404.html`.
 *
 * When the route manifest plugin is absent, only the `navigationFallback` block is written.
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
export function azureStaticWebappAdapter(): Plugin {
	return staticAdapter({
		name: 'rooted:azure-static-webapp',
		async setup({ outputDirectory, manifestApi }) {
			const staticRoutes: AzureRoute[] = []
			const dynamicRoutes: AzureRoute[] = []

			for (const route of manifestApi?.routes ?? []) {
				if (!Object.hasOwn(route, 'getMetadata')) continue
				const metadata = route.getMetadata()

				if (metadata.staticRoute !== false) {
					const staticPath = metadata.staticRoute
					const segments = staticPath.split('/').filter(Boolean)
					if (segments.length === 0) continue
					staticRoutes.push({
						route: staticPath,
						serve: `/${segments.join('/')}/index.html`,
						statusCode: 200,
					})
				} else if (!metadata.hasErrors) {
					const pattern = buildAzurePattern(route)
					dynamicRoutes.push({ route: pattern, rewrite: '/404.html' })
				}
			}

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

// Converts a route to an Azure wildcard pattern.
// Parent routes are resolved recursively; :param tokens become *.
function buildAzurePattern(route: { getMetadata(): { routeParts: Array<string | object> } }): string {
	let pattern = ''
	for (const part of route.getMetadata().routeParts) {
		if (typeof part === 'string') {
			pattern += part
		} else if (Object.hasOwn(part, 'getMetadata')) {
			pattern += buildAzurePattern(part as { getMetadata(): { routeParts: Array<string | object> } })
		} else {
			pattern += '*'
		}
	}
	// Azure doesn't support trailing slash in wildcard patterns, strip it
	return pattern.endsWith('/') ? pattern.slice(0, -1) + '/*' : pattern
}
