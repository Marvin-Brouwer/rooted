import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { Plugin } from 'vite'

export const seoDefaultsPluginName = 'vite-plugin:rooted-seo-defaults'

/** The site-wide title and description, as written in `index.html`. */
export type HtmlSeoDefaults = {
	title: string | undefined
	description: string | undefined
}

/**
 * Reads the `<title>` and the description meta out of an HTML document.
 * Regex, not a parser: it only has to handle an `index.html` somebody wrote by hand.
 */
export function readHtmlSeoDefaults(html: string): HtmlSeoDefaults {
	const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]

	const description = html.match(/<meta\b[^>]*>/gi)
		?.find(tag => /\bname\s*=\s*["']description["']/i.test(tag))
		?.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
		?.slice(1)
		.find(value => value !== undefined)

	return {
		title: title === undefined ? undefined : decodeEntities(title),
		description: description === undefined ? undefined : decodeEntities(description),
	}
}

/**
 * Puts the `index.html` title and description in `import.meta.env.ROOTED_DEFAULT_TITLE` and `ROOTED_DEFAULT_DESCRIPTION`.
 *
 * The router falls back to these when a route has no `seo.title` or `seo.description`.
 * It can't read them off the page: after landing on a pre-rendered static route, the document has that route's title,
 * not the one from `index.html`.
 *
 * Reads `index.html` once, when Vite loads the config, so editing its title during `vite dev` needs a restart to show up here.
 */
export function seoDefaultsPlugin(): Plugin {
	return {
		name: seoDefaultsPluginName,

		async config(userConfig) {
			const root = path.resolve(userConfig.root ?? process.cwd())
			const html = await readFile(path.join(root, 'index.html'), 'utf8').catch(() => undefined)
			if (html === undefined) return

			const { title, description } = readHtmlSeoDefaults(html)
			return {
				define: {
					'import.meta.env.ROOTED_DEFAULT_TITLE': JSON.stringify(title ?? ''),
					'import.meta.env.ROOTED_DEFAULT_DESCRIPTION': JSON.stringify(description ?? ''),
				},
			}
		},
	}
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' }

function decodeEntities(text: string): string {
	return text.replaceAll(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity: string, code: string) => {
		if (code.startsWith('#x') || code.startsWith('#X')) return String.fromCodePoint(Number.parseInt(code.slice(2), 16))
		if (code.startsWith('#')) return String.fromCodePoint(Number.parseInt(code.slice(1), 10))
		return ENTITIES[code.toLowerCase()] ?? entity
	})
}
