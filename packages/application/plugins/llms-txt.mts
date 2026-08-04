import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { resolveRouteSeo } from '@rooted/adapter'

import type { SeoApi } from '@rooted/adapter'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ManifestOptions } from 'vite-plugin-pwa'

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'
const SEO_PLUGIN_NAME = 'rooted:seo'

/**
 * A custom section in the generated `llms.txt`, used to override or extend
 * the auto-generated "Pages" section.
 */
export type LlmsTxtSection = {
	/** Heading shown as `## Title` in the output. */
	title: string
	entries: Array<{
		title: string
		url: string
		description?: string
	}>
}

/**
 * Options for the generated `llms.txt` file.
 */
export type LlmsTxtOptions = {
	/**
	 * Markdown block inserted between the site description and the auto-generated
	 * "Pages" section. Useful for adding extra context, disclaimers, or links.
	 */
	intro?: string
	/**
	 * Override the auto-generated "Pages" section with custom groupings.
	 * When omitted, all static routes with a `seo.title` are listed under "Pages".
	 */
	sections?: LlmsTxtSection[]
}

/**
 * Generates an `llms.txt` file in the build output directory.
 *
 * The file follows the [llmstxt.org](https://llmstxt.org) convention:
 * a Markdown document listing all static routes with their titles and
 * descriptions so AI language models can quickly understand the site structure.
 *
 * Routes without a `seo.title` are skipped (a warning is logged).
 * The home route (`/`) is listed first; remaining routes are sorted
 * alphabetically by title.
 *
 * Only runs during production builds. If no named routes are found, nothing
 * is written.
 *
 * @internal Automatically included by {@link rootedManifest}. Configure via
 * `seo.llmsTxt` in the manifest options.
 */
export function llmsTxtPlugin(
	deploymentUrl: string | undefined,
	webManifest: Partial<ManifestOptions> & { name?: string, description?: string },
	options: LlmsTxtOptions | undefined,
): Plugin {
	let config: ResolvedConfig
	let manifestApi: RouteManifestApi | undefined
	let seoApi: SeoApi | undefined

	function toAbsolute(staticPath: string): string {
		return deploymentUrl
			? new URL(staticPath.slice(1), deploymentUrl).href
			: config.base + staticPath.slice(1)
	}

	return {
		name: 'rooted:llms-txt',
		apply: 'build',

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(p => p.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
			const seoPlugin = resolved.plugins.find(p => p.name === SEO_PLUGIN_NAME)
			seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
		},

		async closeBundle() {
			await seoApi?.prepare()

			const lines: string[] = []

			if (webManifest.name) lines.push(`# ${webManifest.name}`)
			if (webManifest.description) lines.push(`\n> ${webManifest.description}`)
			if (options?.intro) lines.push(`\n${options.intro}`)

			if (options?.sections) {
				for (const section of options.sections) {
					lines.push(`\n## ${section.title}\n`)
					for (const entry of section.entries) {
						const desc = entry.description ? `: ${entry.description}` : ''
						lines.push(`- [${entry.title}](${entry.url})${desc}`)
					}
				}
			}
			else {
				// Auto-generate "Pages" section from static routes
				type PageEntry = { title: string, url: string, description?: string, isHome: boolean }
				const pages: PageEntry[] = []

				if (manifestApi) {
					for (const route of manifestApi.routes) {
						if (!Object.hasOwn(route, 'getMetadata')) continue
						const metadata = route.getMetadata()
						// staticPaths includes constant-token routes unrolled to concrete paths
						const staticPaths = metadata.staticPaths
						if (staticPaths === false) continue

						for (const staticPath of staticPaths) {
							// Lazy seo resolvers are evaluated per generated page
							const seo = await resolveRouteSeo(route, staticPath)
							if (!seo?.title) {
								config.logger.info(`[llms-txt] skipping route ${staticPath}: no seo.title`)
								continue
							}

							pages.push({
								title: seo.title,
								url: toAbsolute(staticPath),
								description: seo.description,
								isHome: staticPath === '/',
							})
						}
					}
				}

				if (pages.length === 0) return

				pages.sort((a, b) => {
					if (a.isHome) return -1
					if (b.isHome) return 1
					return a.title.localeCompare(b.title)
				})

				lines.push('\n## Pages\n')
				for (const page of pages) {
					const desc = page.description ? `: ${page.description}` : ''
					lines.push(`- [${page.title}](${page.url})${desc}`)
				}
			}

			if (lines.length === 0) return

			await writeFile(
				path.join(config.build.outDir, 'llms.txt'),
				lines.join('\n') + '\n',
				'utf8',
			)
		},
	}
}
