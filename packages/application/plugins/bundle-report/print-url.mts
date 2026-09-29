import type { Plugin, ResolvedConfig } from 'vite'

export const bundleReportUrlPluginName = 'vite-plugin:rooted-bundle-report-url'

/** Hosts that mean "listen everywhere", which you can't browse to. */
const wildcardHosts = new Set(['0.0.0.0', '::'])

/**
 * Where `vite preview` serves a file from the build output, going by the preview settings.
 * Preview moves to another port when this one is taken, and a build can't know that in advance.
 */
export function previewUrl(config: Pick<ResolvedConfig, 'base' | 'preview'>, file: string): string {
	const { https, host, port } = config.preview
	const hostname = typeof host === 'string' && !wildcardHosts.has(host) ? host : 'localhost'

	return `${https ? 'https' : 'http'}://${hostname}:${port}${config.base}${file}`
}

/** Prints where to find the report once it's written. */
export function printReportUrl(file: string): Plugin {
	let config: ResolvedConfig | undefined

	return {
		name: bundleReportUrlPluginName,
		apply: 'build',
		configResolved(resolved) {
			config = resolved
		},
		closeBundle: {
			// Sonda writes the report in its own closeBundle, this has to come after it.
			order: 'post',
			sequential: true,
			handler() {
				if (!config) return
				config.logger.info(`Bundle report: ${previewUrl(config, file)} (run \`vite preview\` to see it)`)
			},
		},
	}
}
