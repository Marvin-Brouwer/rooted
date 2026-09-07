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
 * One rewrite rule is generated per parameterized route, so `/recipe/42/` serves
 * the SPA shell and the browser-side router renders it. Firebase uses glob
 * syntax where `*` matches a single path segment, so the rooted `:param` maps
 * to one `*` each.
 *
 * There is no catch-all rewrite. Firebase resolves a request in a fixed order --
 * redirects, exact-match static content, configured rewrites, then the custom
 * 404 page -- so with the catch-all gone an unmatched path falls through to
 * `404.html` with a real `404`. A `{ "source": "**" }` rule would sit in front
 * of that and answer `200` for every typo, which is what it used to do.
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
export function firebaseHostingAdapter(options?: FirebaseHostingAdapterOptions): Plugin[] {
	return staticAdapter({
		name: 'rooted:firebase-hosting',
		routes: options?.routes,
		// The rewrites below are what Firebase matches :param routes with.
		dynamicRoutes: 'routed',
		async setup({ config, resolvedRoutes }) {
			const outDirectory = path.relative(config.root, config.build.outDir) || 'dist'

			const dynamicRewrites: FirebaseRewrite[] = resolvedRoutes.dynamicPatterns
				.map(p => ({ source: toWildcard(p), destination: '/404.html' }))

			const firebaseConfig: FirebaseConfig = {
				hosting: {
					public: outDirectory,
					trailingSlash: true,
					ignore: ['firebase.json', '**/.*'],
					rewrites: dynamicRewrites,
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
