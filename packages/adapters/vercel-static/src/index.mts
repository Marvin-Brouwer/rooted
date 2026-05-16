import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

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
 * When the route manifest plugin is absent, only the catch-all rewrite is written.
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
export function vercelStaticAdapter(): Plugin {
	return staticAdapter({
		name: 'rooted:vercel-static',
		async setup({ config, manifestApi }) {
			const dynamicRewrites: VercelRewrite[] = []

			for (const route of manifestApi?.routes ?? []) {
				if (!Object.hasOwn(route, 'getMetadata')) continue
				const metadata = route.getMetadata()
				if (metadata.staticRoute !== false) continue
				if (metadata.hasErrors) continue
				dynamicRewrites.push({
					source: buildVercelPattern(route),
					destination: '/404.html',
				})
			}

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

// Converts a route to a Vercel rewrite source pattern.
// Parent routes are resolved recursively; :param tokens use Vercel's :key syntax.
function buildVercelPattern(route: { getMetadata(): { routeParts: Array<string | object> } }): string {
	let pattern = ''
	for (const part of route.getMetadata().routeParts) {
		if (typeof part === 'string') {
			pattern += part
		} else if (Object.hasOwn(part, 'getMetadata')) {
			pattern += buildVercelPattern(part as { getMetadata(): { routeParts: Array<string | object> } })
		} else {
			pattern += `:${(part as { key: string }).key}`
		}
	}
	// Strip trailing slash -- Vercel patterns don't require it and it avoids double-matching
	return pattern.endsWith('/') ? pattern.slice(0, -1) : pattern
}
