import matter from 'gray-matter'
import { minify, Options as MinifyOptions } from 'html-minifier-terser'
import { marked, MarkedOptions } from 'marked'

import type { Plugin } from 'vite'

const markedOptions: MarkedOptions = {
	async: true,
}
const minifyOptions: MinifyOptions = {
	collapseWhitespace: true,
	removeComments: true,
	removeOptionalTags: true,
	decodeEntities: true,
}

/**
 * Transforms `.md` files into plain JS modules at build time (Node.js context).
 * Frontmatter becomes enumerable properties; the markdown body becomes `html`.
 * No Node-specific APIs (Buffer, fs, …) reach the browser bundle.
 */
export function markdownPlugin(): Plugin {
	let isDevelopment = false

	return {
		name: 'vite-plugin:markdown',
		configResolved(config) {
			isDevelopment = config.command === 'serve'
		},
		async transform(code, id) {
			if (!id.endsWith('.md')) return

			const { data, content } = matter(code)
			const markedResult = await marked(content, markedOptions)
			const html = isDevelopment
				? markedResult
				: await minify(markedResult, minifyOptions)

			return {
				code: `export default ${JSON.stringify({ ...data, html })}`,
				map: undefined,
			}
		},
	}
}
