import fs from 'node:fs/promises'

import type { Plugin } from './tsup-plugin.mts'

/**
 * tsup plugin that removes duplicate `//# sourceMappingURL=` comments from
 * bundled chunks.
 *
 * tsup has a bug where having more than one entry point causes each chunk to
 * receive multiple source-map URL comments. This plugin strips all but the last
 * one in `buildEnd` (after all file I/O is done), so the fix runs after both
 * esbuild and tsup have appended their own sourcemap comments.
 *
 * We assume we can remove all `//# sourceMappingURL=` which are not data urls. \
 * Since we default to inline mapping.
 *
 * @example `tsup.config.mts`
 * ```ts
 * import { dedupeSourcemapsPlugin } from '@rooted/tsup-plugins'
 *
 * export default defineConfig({
 *   plugins: [dedupeSourcemapsPlugin()],
 * })
 * ```
 */
export function dedupeSourcemapsPlugin(): Plugin {
	return {
		name: 'tsup:dedupe-sourcemaps',
		async buildEnd({ writtenFiles }) {
			await Promise.all(
				writtenFiles
					.filter(f => /\.[cm]?js$/.test(f.name))
					.map(async (f) => {
						const code = await fs.readFile(f.name, 'utf8')
						const fixed = code.replaceAll(/(\/\/# sourceMappingURL=[^\n]*\n)(?=[\s\S]*\/\/# sourceMappingURL=)/g, '')
						if (fixed !== code) await fs.writeFile(f.name, fixed, 'utf8')
					}),
			)
		},
	}
}
