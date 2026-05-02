import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { SeoApi } from './seo-api.mts'
import type { Plugin, ResolvedConfig } from 'vite'

const SEO_PLUGIN_NAME = 'rooted:seo'

/**
 * Options for the generated `robots.txt`.
 */
export type RobotsOptions = {
	/**
	 * Fully replaces the generated content.
	 * When set, all other options are ignored.
	 */
	content?: string
	/**
	 * Extra lines appended after the generated default content.
	 * Use this to add extra `User-agent` / `Disallow` / `Allow` rules.
	 */
	append?: string
}

const DEFAULT_AI_CRAWLERS = [
	'GPTBot',
	'OAI-SearchBot',
	'ChatGPT-User',
	'ClaudeBot',
	'anthropic-ai',
	'Google-Extended',
	'PerplexityBot',
	'cohere-ai',
	'Applebot-Extended',
	'YouBot',
]

/**
 * Generates a `robots.txt` in the build output directory.
 *
 * By default produces:
 * - `User-agent: * / Allow: /` for all crawlers
 * - Individual `Allow: /` entries for common AI crawlers
 * - A `Sitemap:` line pointing to `sitemap-index.xml` (when additional sitemaps
 *   are registered) or `sitemap.xml`, when a deployment URL is configured
 *
 * Pass `robots: false` in the `seo` manifest options to disable this plugin.
 *
 * @internal Automatically included by {@link rootedManifest}. Configure via
 * `seo.robots` in the manifest options.
 */
export function robotsPlugin(
	deploymentUrl: string | undefined,
	options: RobotsOptions | undefined,
): Plugin {
	let config: ResolvedConfig
	let seoApi: SeoApi | undefined

	return {
		name: 'rooted:robots',
		apply: 'build',

		configResolved(resolved) {
			config = resolved
			const seoPlugin = resolved.plugins.find(p => p.name === SEO_PLUGIN_NAME)
			seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
		},

		async closeBundle() {
			const outputPath = path.join(config.build.outDir, 'robots.txt')

			if (options?.content !== undefined) {
				await writeFile(outputPath, options.content, 'utf8')
				return
			}

			const aiCrawlerLines = DEFAULT_AI_CRAWLERS.flatMap(agent => [
				`User-agent: ${agent}`,
				'Allow: /',
				'',
			])

			const sitemapUrl = seoApi?.getSitemapUrl()
				?? (deploymentUrl ? new URL('sitemap.xml', deploymentUrl).href : undefined)

			const content = [
				'User-agent: *',
				'Allow: /',
				'',
				'# AI crawlers',
				...aiCrawlerLines,
				...(sitemapUrl ? [`Sitemap: ${sitemapUrl}`] : []),
				...(options?.append ? ['', options.append] : []),
			].join('\n')

			await writeFile(outputPath, content, 'utf8')
		},
	}
}
