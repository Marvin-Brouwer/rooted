import { Plugin } from './tsup-plugin.mts'

/**
 * tsup plugin that removes duplicate `//# sourceMappingURL=` comments from
 * bundled chunks.
 *
 * tsup has a bug where having more than one entry point causes each chunk to
 * receive multiple source-map URL comments. This plugin strips all but the last
 * one via `renderChunk`, so no file I/O is needed after the build.
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
		renderChunk(code) {
			const fixed = code.replace(
				/(\/\/# sourceMappingURL=[^\n]*\n)(\/\/# sourceMappingURL=[^\n]*)/g,
				'$2',
			)
			if (fixed === code) return
			return { code: fixed }
		},
	}
}
