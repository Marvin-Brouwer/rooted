import { rm } from 'node:fs/promises'
import path from 'node:path'

import type { Plugin } from 'vite'

export const bundleReportSourcemapsPluginName = 'vite-plugin:rooted-bundle-report-sourcemaps'

/**
 * Sonda needs sourcemaps to break a chunk down into modules.
 * When the build wasn't going to write any, this turns them on (hidden) for the report,
 * then removes the ones it caused once the report is written, so the output is what it would have been.
 * Maps the app asked for itself are left alone.
 */
export function reportSourcemaps(): Plugin {
	let added = false
	const written: string[] = []

	return {
		name: bundleReportSourcemapsPluginName,
		apply: 'build',
		config(config) {
			if (config.build?.sourcemap) return
			added = true
			return { build: { sourcemap: 'hidden' } }
		},
		writeBundle(options, bundle) {
			if (!added || !options.dir) return
			for (const fileName of Object.keys(bundle)) {
				if (fileName.endsWith('.map')) written.push(path.resolve(options.dir, fileName))
			}
		},
		closeBundle: {
			// Sonda reads the maps in its own closeBundle, this has to come after it.
			order: 'post',
			sequential: true,
			async handler() {
				await Promise.all(written.map(file => rm(file, { force: true })))
				written.length = 0
			},
		},
	}
}
