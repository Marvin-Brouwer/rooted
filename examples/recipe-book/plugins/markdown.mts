import type { Plugin } from 'vite'
import matter from 'gray-matter'
import { marked } from 'marked'
import { minify } from 'html-minifier-terser'

/**
 * Transforms `.md` files into plain JS modules at build time (Node.js context).
 * Frontmatter becomes enumerable properties; the markdown body becomes `html`.
 * No Node-specific APIs (Buffer, fs, …) reach the browser bundle.
 */
export function markdownPlugin(): Plugin {
	return {
		name: 'vite-plugin:markdown',
		async transform(code, id) {
			if (!id.endsWith('.md')) return null

			const { data, content } = matter(code)
			const html = await minify(await marked(content, { async: true }), {
				collapseWhitespace: true,
				removeComments: true,
				removeOptionalTags: true,
				decodeEntities: true,
			})

			return {
				code: `export default ${JSON.stringify({ ...data, html })}`,
				map: null,
			}
		},
	}
}
