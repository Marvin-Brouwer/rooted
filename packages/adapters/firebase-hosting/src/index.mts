import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link firebaseHostingAdapter}.
 */
export type FirebaseHostingAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Adapter for Firebase Hosting.
 *
 * Writes `firebase.json` to the Vite project root (not the output directory).
 * Always written -- the build controls the deployment config.
 *
 * When routes are available (via `generateRouteManifest` or the `routes` option),
 * specific rewrite rules are generated for parameterized routes before the catch-all.
 * Firebase uses glob syntax: `*` matches a single path segment. The rooted `:param`
 * syntax maps to `*` per segment.
 *
 * `"trailingSlash": true` is always included since the rooted router enforces trailing slashes.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 * import { firebaseHostingAdapter } from '@rooted-adapters/firebase-hosting'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     firebaseHostingAdapter(),
 *   ],
 * })
 * ```
 */
export function firebaseHostingAdapter(options?: FirebaseHostingAdapterOptions): Plugin {
	return staticAdapter({
		name: 'rooted:firebase-hosting',
		routes: options?.routes,
		async setup({ config, resolvedRoutes }) {
			const outDirectory = path.relative(config.root, config.build.outDir) || 'dist'

			const dynamicRewrites: FirebaseRewrite[] = resolvedRoutes.dynamicPatterns
				.map(p => ({ source: toWildcard(p), destination: '/404.html' }))

			const firebaseConfig: FirebaseConfig = {
				hosting: {
					public: outDirectory,
					trailingSlash: true,
					ignore: ['firebase.json', '**/.*'],
					rewrites: [
						...dynamicRewrites,
						{ source: '**', destination: '/404.html' },
					],
				},
			}

			await writeFile(
				path.join(config.root, 'firebase.json'),
				JSON.stringify(firebaseConfig, undefined, 2),
				'utf8',
			)
		},
	})
}

type FirebaseRewrite = { source: string; destination: string }

type FirebaseConfig = {
	hosting: {
		public: string
		trailingSlash: boolean
		ignore: string[]
		rewrites: FirebaseRewrite[]
	}
}

// Converts :param tokens to Firebase glob wildcard (*) segments.
function toWildcard(pattern: string): string {
	return pattern.replace(/:[\w]+/g, '*')
}
