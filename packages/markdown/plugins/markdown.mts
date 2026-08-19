import matter from 'gray-matter'
import { Marked } from 'marked'

import type { Options as MinifyOptions } from 'html-minifier-terser'
import type { Plugin, ResolvedConfig } from 'vite'

/**
 * Options for {@link rootedMarkdown}.
 */
export type MarkdownPluginOptions = {
	/**
	 * Minify the rendered HTML. Defaults to `true` for builds and `false` for
	 * the dev server, so what you read in devtools matches the source.
	 */
	minify?: boolean
}

const minifyOptions: MinifyOptions = {
	collapseWhitespace: true,
	removeComments: true,
	removeOptionalTags: true,
	decodeEntities: true,
}

/**
 * Turns `.md` files into modules at build time, so no markdown parser reaches
 * the browser bundle.
 *
 * Each file becomes `frontmatter` (whatever the YAML block contained) and
 * `html` (everything after it, rendered by `marked`), exported both by name
 * and as a default:
 *
 * ```ts
 * import { frontmatter, html } from './about.md'
 * ```
 *
 * Because `html` is a named export, the module itself satisfies the `Markdown`
 * component's `source`, so you can hand a dynamic import straight over:
 *
 * ```ts
 * append(create(Markdown, {
 *   source: await import('./about.md')
 * }))
 * ```
 *
 * Imports carrying a query (`./about.md?raw`, `?url`) are left alone for Vite
 * to handle.
 *
 * Reference `@rooted/markdown/vite/types` from your env declarations so
 * TypeScript knows what a `.md` import is.
 */
export function rootedMarkdown(options: MarkdownPluginOptions = {}): Plugin {
	// A private instance: `marked.use(...)` mutates a shared singleton, which
	// would leak into anything else in the app that uses marked.
	const marked = new Marked()
	let config: ResolvedConfig

	return {
		name: 'vite-plugin:rooted-markdown',
		configResolved(resolvedConfig) {
			config = resolvedConfig
		},
		async transform(code, id) {
			const [file, query] = id.split('?')
			// A query means the caller asked Vite for something specific (?raw, ?url)
			if (query !== undefined || !file.endsWith('.md')) return

			const { data, content } = matter(code)
			const rendered = await marked.parse(content)
			const shouldMinify = options.minify ?? config.command === 'build'
			const html = shouldMinify
				? await (await import('html-minifier-terser')).minify(rendered, minifyOptions)
				: rendered

			const frontmatter = JSON.stringify(data)
			return {
				code: [
					`export const frontmatter = ${frontmatter}`,
					`export const html = ${JSON.stringify(html)}`,
					'export default { frontmatter, html }',
				].join('\n'),
				map: undefined,
			}
		},
	}
}
