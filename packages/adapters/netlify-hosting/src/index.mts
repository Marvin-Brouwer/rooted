import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { staticAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

/**
 * Adapter for Netlify static hosting.
 *
 * Writes a `_redirects` file to the output directory. Netlify reads this file
 * from the deployed content and routes unknown paths to `404.html` -- the plain
 * SPA shell that lets the browser-side router handle the URL.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { netlifyHostingAdapter } from '@rooted-adapters/netlify-hosting'
 *
 * export default rootedManifest({
 *   plugins: [netlifyHostingAdapter()],
 * })
 * ```
 */
export function netlifyHostingAdapter(): Plugin {
	return staticAdapter({
		name: 'rooted:netlify-hosting',
		async setup({ outputDirectory }) {
			await writeFile(
				path.join(outputDirectory, '_redirects'),
				'/*  /404.html  200\n',
				'utf8',
			)
		},
	})
}
