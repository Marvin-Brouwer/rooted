import SondaVitePlugin from 'sonda/vite'

import { printReportUrl } from './bundle-report/print-url.mts'
import { reportSourcemaps } from './bundle-report/sourcemaps.mts'
import { withStyles } from './bundle-report/styles.mts'

import type { Plugin, PluginOption } from 'vite'

const filename = 'bundle'

/**
 * A treemap of what ended up in your bundle, made by [Sonda](https://sonda.dev).
 *
 * It does nothing on a normal build. Build with `--report-bundle` and it writes `dist/bundle.html`.
 * Nothing opens by itself: look at it with `vite preview`. Outside CI the build prints the URL to go to.
 * Sizes are read from the sourcemaps of the minified output, with gzip and brotli next to them.
 * Working those out makes the build noticeably slower, which is why it waits for the flag.
 * If the build wasn't writing sourcemaps, it writes them for the report and deletes them afterwards,
 * so `dist` ends up with `bundle.html` and no `.map` files.
 *
 * `vite dev` doesn't make a report, since it doesn't bundle anything.
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
 * vite build -- --report-bundle
 * vite preview
 * ```
 */
export function bundleReport(): PluginOption {
	if (!process.argv.includes('--report-bundle')) return []

	return [
		withStyles(SondaVitePlugin({
			open: false,
			format: 'html',
			filename,
			outputDir: 'dist',
			gzip: true,
			brotli: true,
		}) as Plugin),
		reportSourcemaps(),
		!process.env.CI && printReportUrl(`${filename}.html`),
	]
}
