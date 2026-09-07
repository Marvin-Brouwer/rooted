import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link vercelStaticAdapter}.
 */
export type VercelStaticAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Adapter for Vercel static hosting.
 *
 * Writes `vercel.json` to the Vite project root. Always written -- the build
 * controls the deployment config.
 *
 * Vercel serves pre-rendered HTML files automatically (it finds `/categories/index.html`
 * for `/categories/`), so rewrites are only generated for parameterized routes and
 * the final catch-all. The destination is `404.html` -- the plain SPA shell.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 * import { vercelStaticAdapter } from '@rooted-adapters/vercel-static'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     vercelStaticAdapter(),
 *   ],
 * })
 * ```
 */
export function vercelStaticAdapter(options?: VercelStaticAdapterOptions): Plugin {
	return staticAdapter({
		name: 'rooted:vercel-static',
		routes: options?.routes,
		async setup({ config, resolvedRoutes }) {
			const dynamicRewrites: VercelRewrite[] = resolvedRoutes.dynamicPatterns
				.map(p => ({
					source: p.endsWith('/') ? p.slice(0, -1) : p,
					destination: '/404.html',
				}))

			const vercelConfig: VercelConfig = {
				rewrites: [
					...dynamicRewrites,
					{ source: '/(.*)', destination: '/404.html' },
				],
			}

			await writeFile(
				path.join(config.root, 'vercel.json'),
				JSON.stringify(vercelConfig, undefined, 2),
				'utf8',
			)
		},
	})
}

type VercelRewrite = { source: string; destination: string }
type VercelConfig = { rewrites: VercelRewrite[] }
