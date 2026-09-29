import path from 'node:path'

import SondaVitePlugin from 'sonda/vite'

import { openFile } from './bundle-report/open.mts'

import type { Logger, Plugin, PluginOption } from 'vite'

export const bundleReportOpenPluginName = 'vite-plugin:rooted-bundle-report-open'

const outputDirectory = 'dist'
const filename = 'stats'

/** Opens the report once Sonda has written it. A machine without a browser gets a warning, not a failed build. */
function openReport(file: string): Plugin {
	let logger: Logger | undefined

	return {
		name: bundleReportOpenPluginName,
		apply: 'build',
		configResolved(config) {
			logger = config.logger
		},
		closeBundle: {
			// Sonda writes the report in its own closeBundle, this has to come after it.
			order: 'post',
			sequential: true,
			async handler() {
				const reason = await openFile(file)
				if (reason) logger?.warn(`Couldn't open the bundle report, ${reason}. It's at ${file}`)
			},
		},
	}
}

/**
 * A treemap of what ended up in your bundle, made by [Sonda](https://sonda.dev).
 *
 * It does nothing on a normal build. Build with `--analyze` and it writes `dist/stats.html` and opens it in your browser.
 * In CI, or on a machine without a browser, it only writes the file.
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
	if (!process.argv.includes('--analyze')) return []

	return [
		SondaVitePlugin({
			// Opened by openReport instead, Sonda's own opener crashes the build when there's no browser.
			open: false,
			format: 'html',
			filename,
			outputDir: outputDirectory,
			gzip: true,
			brotli: true,
			exclude: [
				// Only take one flavor of css, the other one distracts from the bundle size
				/\.tagged\.css$/is,
				/\.tagged-[A-Za-z0-9_-]+\.css$/i,
			],
		}),
		!process.env.CI && openReport(path.resolve(outputDirectory, `${filename}.html`)),
	]
}
