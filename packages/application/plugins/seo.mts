import { execFile } from 'node:child_process'
import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import { glob } from 'tinyglobby'

import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin, ResolvedConfig } from 'vite'

const execFileAsync = promisify(execFile)

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'

const DEFAULT_HOME_ROUTE_FILES = [
	'./src/navigation/application.mts',
	'./src/navigation/*.mts',
	'!./src/navigation/not-found.mts',
]

export type SeoOptions = {
	/**
	 * Glob patterns (relative to the Vite project root) used to discover
	 * home/navigation files. The newest `git log` date among all matched files
	 * is used as the `lastmod` for the root sitemap entry.
	 * Supports negation patterns (prefix with `!`).
	 * @default ['./src/navigation/application.mts', './src/navigation/*.mts', '!./src/navigation/not-found.mts']
	 */
	homeRouteFiles?: string[]
}

/**
 * SEO plugin — generates a `sitemap.xml` from all static routes discovered by
 * {@link generateRouteManifest}, plus a root entry whose `lastmod` is the
 * newest git commit date across the configured home route files.
 *
 * Runs only during production builds. If no static routes are found at all,
 * nothing is written.
 *
 * Uses `git log` to determine per-file `lastmod`, falling back to `stat` mtime
 * when the file is not tracked.
 *
 * @internal Automatically included by {@link rootedManifest}. Configure via
 * `seo` in the manifest options.
 */
export function seoPlugin(deploymentUrl: string | undefined, options: SeoOptions | undefined): Plugin {
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
			function toLocation(staticPath: string): string {
				return deploymentUrl
					? new URL(staticPath.slice(1), deploymentUrl).href
					: config.base + staticPath.slice(1)
			}

			// Pass 1: find the newest git date among home/navigation files
			const homeGlobs = options?.homeRouteFiles ?? DEFAULT_HOME_ROUTE_FILES
			const homeFiles = await glob(homeGlobs, { cwd: config.root, absolute: true })
			const homeDates = await Promise.all(homeFiles.map((f: string) => gitLastModified(f, config.root)))
			const homeLastModified = homeDates.toSorted().at(-1)

			// Pass 2: build the full list of { loc, lastmod } entries
			type SitemapEntry = { loc: string, lastmod: string }
			const entries = new Map<string, SitemapEntry>()

			if (homeLastModified !== undefined) {
				const loc = toLocation('/')
				entries.set(loc, { loc, lastmod: homeLastModified })
			}

			if (manifestApi) {
				for (const route of manifestApi.routes) {
					if (!Object.hasOwn(route, 'getMetadata')) continue
					const staticPath = route.getMetadata().staticRoute
					if (staticPath === false) continue

					const loc = toLocation(staticPath)
					if (entries.has(loc)) continue

					const sourceFile = manifestApi.routeSourceFiles.get(route)
					const lastmod = await gitLastModified(sourceFile, config.root)
					entries.set(loc, { loc, lastmod })
				}
			}

			if (entries.size === 0) return

			// Pass 3: construct the sitemap XML and write the asset
			const xml = [
				`<?xml version="1.0" encoding="UTF-8"?>`,
				`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
				...[...entries.values()].map(({ loc, lastmod }) =>
					`\t<url>\n\t\t<loc>${loc}</loc>\n\t\t<lastmod>${lastmod}</lastmod>\n\t</url>`,
				),
				`</urlset>`,
			].join('\n')

			await writeFile(path.join(config.build.outDir, 'sitemap.xml'), xml, 'utf8')
		},
	}
}

async function gitLastModified(filePath: string | undefined, cwd: string): Promise<string> {
	if (filePath) {
		try {
			const { stdout } = await execFileAsync(
				'git', ['log', '-1', '--format=%aI', '--', filePath],
				{ cwd },
			)
			const iso = stdout.trim()
			if (iso) return new Date(iso).toISOString().slice(0, 10)
		}
		catch {
			// not a git repo or file untracked — fall through to stat
		}
	}

	const fileStat = filePath ? await stat(filePath) : undefined
	return (fileStat?.mtime ?? new Date()).toISOString().slice(0, 10)
}
