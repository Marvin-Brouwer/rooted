import type { SettleOptions } from '@rooted/prerender'
import type { Plugin } from 'vite'

export type { SettleOptions } from '@rooted/prerender'

/** The plugin name the adapter's build looks for, to find the settings {@link prerenderSettings} carries. */
export const prerenderSettingsPluginName = 'rooted:prerender-settings'

/**
 * Hands the adapter's pre-render pass how long to wait for each page to finish rendering.
 * The plugin does nothing else, it's how the setting reaches whichever adapter is in the config.
 *
 * `rootedManifest` adds it for you from its `prerender` option. Add it yourself only when you don't use `rootedManifest`.
 *
 * @example
 * ```ts
 * plugins: [
 * 	prerenderSettings({ quietPeriod: 100, timeout: 5000 }),
 * 	githubPagesAdapter(),
 * ]
 * ```
 */
export function prerenderSettings(settle: SettleOptions): Plugin {
	return {
		name: prerenderSettingsPluginName,
		apply: 'build',
		api: { settle },
	}
}
