import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin, ResolvedConfig } from 'vite'

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'

/**
 * SEO plugin — generates a `sitemap.xml` from all static routes discovered by
 * {@link generateRouteManifest}.
 *
 * Runs only during production builds. If the route manifest plugin is absent,
 * or no static routes are found, nothing is written.
 *
 * @internal Automatically included by {@link rootedManifest}. Pass the
 * deployment URL via `webManifest.url` to get absolute `<loc>` entries.
 */
export function seoPlugin(deploymentUrl: string | undefined): Plugin {
	let config: ResolvedConfig
	let manifestApi: RouteManifestApi | undefined

	return {
		name: 'rooted:seo',
		apply: 'build',

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(p => p.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
		},

		async closeBundle() {
			if (!manifestApi) return

			const staticRoutes: string[] = [
				'/',
			]

			for (const route of manifestApi.routes) {
				if (!Object.hasOwn(route, 'getMetadata')) continue
				const staticPath = route.getMetadata().staticRoute
				if (staticPath === false) continue
				staticRoutes.push(staticPath)
			}

			if (staticRoutes.length === 0) return

			const locations = staticRoutes.map((staticPath) => {
				if (deploymentUrl) {
					return new URL(staticPath.slice(1), deploymentUrl).href
				}
				return config.base + staticPath.slice(1)
			})

			const xml = [
				`<?xml version="1.0" encoding="UTF-8"?>`,
				`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
				...locations.map(loc => `\t<url>\n\t\t<loc>${loc}</loc>\n\t</url>`),
				`</urlset>`,
			].join('\n')

			await writeFile(path.join(config.build.outDir, 'sitemap.xml'), xml, 'utf8')
		},
	}
}
