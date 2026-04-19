import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { Plugin, ResolvedConfig } from 'vite'

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
 * - A `Sitemap:` line when `deploymentUrl` is configured
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

	return {
		name: 'rooted:robots',
		apply: 'build',

		configResolved(resolved) {
			config = resolved
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

			const content = [
				'User-agent: *',
				'Allow: /',
				'',
				'# AI crawlers',
				...aiCrawlerLines,
				...(deploymentUrl ? [`Sitemap: ${new URL('sitemap.xml', deploymentUrl).href}`] : []),
				...(options?.append ? ['', options.append] : []),
			].join('\n')

			await writeFile(outputPath, content, 'utf8')
		},
	}
}
