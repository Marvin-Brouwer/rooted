import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

/**
 * Adapter for Firebase Hosting.
 *
 * Writes `firebase.json` to the Vite project root (not the output directory).
 * Always written -- the build controls the deployment config.
 *
 * When the route manifest plugin is present, specific rewrite rules are generated for
 * parameterized routes before the catch-all. Firebase uses glob syntax: `*` matches a
 * single path segment. The rooted `:param` syntax maps to `*` per segment.
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
export function firebaseHostingAdapter(): Plugin {
	return staticAdapter({
		name: 'rooted:firebase-hosting',
		async setup({ config, manifestApi }) {
			const outDirectory = path.relative(config.root, config.build.outDir) || 'dist'

			const dynamicRewrites: FirebaseRewrite[] = []
			for (const route of manifestApi?.routes ?? []) {
				if (!Object.hasOwn(route, 'getMetadata')) continue
				const metadata = route.getMetadata()
				if (metadata.staticRoute !== false) continue
				if (metadata.hasErrors) continue
				dynamicRewrites.push({
					source: buildFirebasePattern(route),
					destination: '/404.html',
				})
			}

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

// Converts a route to a Firebase glob pattern.
// Parent routes are resolved recursively; :param tokens become *.
// Trailing slash is kept since Firebase uses ** for catch-all.
function buildFirebasePattern(route: { getMetadata(): { routeParts: Array<string | object> } }): string {
	let pattern = ''
	for (const part of route.getMetadata().routeParts) {
		if (typeof part === 'string') {
			pattern += part
		} else if (Object.hasOwn(part, 'getMetadata')) {
			pattern += buildFirebasePattern(part as { getMetadata(): { routeParts: Array<string | object> } })
		} else {
			pattern += '*'
		}
	}
	return pattern
}
