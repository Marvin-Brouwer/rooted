import SondaVitePlugin from 'sonda/vite'

import type { PluginOption } from 'vite'

/**
 * A treemap of what ended up in your bundle, made by [Sonda](https://sonda.dev).
 *
 * It does nothing on a normal build. Build with `--analyze` and it writes `dist/stats.html` and opens it in your browser.
 * Sizes are read from the sourcemaps of the minified output, with gzip and brotli next to them.
 * Working those out makes the build noticeably slower, which is why it waits for the flag.
 *
 * You don't need this for the numbers alone, every build already prints the size of each file it writes.
 *
 * @example
 * ```ts
 * // vite.config.mts
 * import { bundleReport, rootedManifest } from '@rooted/application'
 *
 * export default rootedManifest({
 *   // ...
 *   plugins: [bundleReport()],
 * })
 * ```
 *
 * ```sh
 * vite build -- --analyze
 * ```
 */
export function bundleReport(): PluginOption {
	return SondaVitePlugin({
		enabled: process.argv.includes('--analyze'),
		open: true,
		format: 'html',
		filename: 'stats',
		outputDir: 'dist',
		gzip: true,
		brotli: true,
		exclude: [
			// Only take one flavor of css, the other one distracts from the bundle size
			/\.tagged\.css$/is,
			/\.tagged-[A-Za-z0-9_-]+\.css$/i,
		],
	})
}
