import path from 'node:path'

import { createDevelopmentCheck, type DevelopmentCheck } from './dictionary-check/development.mts'
import { cachedResolve } from './dictionary-check/link.mts'
import { runCheck } from './dictionary-check/run.mts'
import { isScannable, scanModule, type ModuleScan } from './dictionary-check/scan.mts'

import type { Plugin, ResolvedConfig } from 'vite'

/** Options for {@link localizationDictionaryCheck}. */
export type DictionaryCheckOptions = {
	/**
	 * Fail the build when a dictionary is missing entries, instead of warning.
	 * Leave it off while a locale is still being translated, since a half-finished dictionary is a normal state to be in.
	 * Unused entries only ever warn, and `vite dev` only ever warns.
	 *
	 * @defaultValue `false`
	 */
	strict?: boolean
}

/**
 * Checks every dictionary against the `localization.text` call sites at build time,
 * and reports entries that are missing and entries nothing uses anymore.
 *
 * ```ts
 * import { localizationDictionaryCheck } from '@rooted/localization/vite'
 *
 * plugins: [localizationDictionaryCheck(), myAdapter()]
 * ```
 *
 * It needs no options. Call sites are found by following imports back to the `configureLocalization` call,
 * so the instance can be named, renamed or re-exported however you like.
 * The key is built the same way `text` builds it at runtime, so what the check reports is what would render untranslated.
 *
 * Dictionaries are read from source. Their keys are the default-language text written out, so they're string literals;
 * a key that isn't can't be read, and the check says so instead of guessing.
 *
 * It runs when `vite dev` starts, again every time you save a file it covers, and at the end of `vite build`.
 * In dev it follows the imports from `index.html` itself, so pages you haven't opened are checked too, and `strict` never stops the dev server.
 *
 * It only sees modules the app actually loads (`import.meta.glob` isn't followed in dev),
 * and only `text` reached through a plain import, re-export or destructure, not one passed as an argument or stored on an object.
 */
export function localizationDictionaryCheck(options: DictionaryCheckOptions = {}): Plugin {
	const name = 'vite-plugin:rooted-localization-dictionary-check'
	const scans = new Map<string, ModuleScan>()
	let config: ResolvedConfig | undefined
	let development: DevelopmentCheck | undefined

	function display(id: string): string {
		return path.relative(config?.root ?? process.cwd(), id).replaceAll('\\', '/')
	}

	return {
		name,
		// Once per build is enough, other environments would repeat the report
		applyToEnvironment: environment => environment.name === 'client',

		configResolved(resolvedConfig) {
			config = resolvedConfig
		},

		// Only reruns the check, HMR itself carries on as usual
		hotUpdate({ type, file }) {
			development?.fileChanged(type, file)
		},

		// In dev this runs once, when the server starts
		buildStart() {
			scans.clear()
			if (config?.command !== 'serve') return
			development = createDevelopmentCheck({
				config,
				logger: config.logger,
				resolve: cachedResolve((source, importer) => this.resolve(source, importer)),
				label: `[${name}]`,
				display,
			})
			// Not awaited, the server shouldn't wait for the report
			development.run()
		},

		// Before other transforms, so positions point into the source as written.
		// Only in a build: dev only transforms what the browser asks for, so it reads the files itself.
		transform: {
			order: 'pre',
			handler(code, id) {
				if (config?.command !== 'build' || !isScannable(id)) return
				try {
					scans.set(id, scanModule(code, id))
				}
				catch {
					// Not parseable as-is, the build reports that on its own
				}
			},
		},

		async buildEnd(error) {
			if (error || config?.command !== 'build') return

			const resolve = cachedResolve((source, importer) => this.resolve(source, importer))
			const result = await runCheck({ scans, resolve, display })

			for (const message of [...result.notes, ...result.unused]) this.warn(message)
			if (result.missing.length === 0) return
			if (options.strict) this.error(result.missing.join('\n'))
			for (const message of result.missing) this.warn(message)
		},
	}
}
