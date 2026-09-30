import type { Plugin } from 'vite'

type WriteBundle = Extract<Plugin['writeBundle'], (...parameters: never[]) => unknown>
type Bundle = Parameters<WriteBundle>[1]

/**
 * Lets the CSS files into Sonda's report.
 *
 * Sonda's Rollup integration (0.14) only measures chunks, it hands every other output file over without an entry and then skips it.
 * The css-loader emits CSS as plain assets, so none of it showed up in the treemap.
 * Passing the CSS files as chunks without an entry gets them measured, as one block each:
 * there are no CSS sourcemaps to break them down further.
 * Drop this once Sonda includes assets by itself.
 */
export function withStyles(sonda: Plugin): Plugin {
	const writeBundle = sonda.writeBundle as WriteBundle | undefined
	if (!writeBundle) return sonda

	return {
		...sonda,
		writeBundle(options, bundle) {
			const withCss: Bundle = {}
			for (const [fileName, output] of Object.entries(bundle)) {
				withCss[fileName] = output.type === 'asset' && fileName.endsWith('.css')
					? { ...output, type: 'chunk', facadeModuleId: null } as unknown as Bundle[string]
					: output
			}
			return writeBundle.call(this, options, withCss)
		},
	}
}
