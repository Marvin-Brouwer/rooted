import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { seoPluginName } from './plugin-names.mts'

import type { LlmsTxtOptions, SeoApi } from './seo-api.mts'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ManifestOptions } from 'vite-plugin-pwa'

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
			const seoPlugin = resolved.plugins.find(p => p.name === seoPluginName)
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
				// Pages come from whoever registered them with the seo plugin.
				// This plugin doesn't know what a route is; `@rooted/seo/router`
				// is what supplies them when routing is in use.
				type Listing = { title: string, url: string, description?: string, isHome: boolean }
				const pages: Listing[] = []

				for (const page of await seoApi?.getPages() ?? []) {
					const seo = seoApi?.getPageSeo(page.path)
					if (!seo?.title) {
						config.logger.info(`[llms-txt] skipping ${page.path}: no seo.title`)
						continue
					}

					pages.push({
						title: seo.title,
						url: toAbsolute(page.path),
						description: seo.description,
						isHome: page.path === '/',
					})
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
