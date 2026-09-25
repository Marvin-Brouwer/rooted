import path from 'node:path'

import { routeManifestPluginName } from '@rooted/seo'

import { readEntries } from './dictionary-check/entries.mts'
import { linkSites, type Resolve } from './dictionary-check/link.mts'
import { compareEntries, formatMissing, formatUnused } from './dictionary-check/report.mts'
import { scanModule, type ModuleScan } from './dictionary-check/scan.mts'
import { collectLocaleTokenInfos } from './locale-tokens.mts'

import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin } from 'vite'

/** Options for {@link localizationDictionaryCheck}. */
export type DictionaryCheckOptions = {
	/**
	 * Fail the build when a dictionary is missing entries, instead of warning.
	 * Leave it off while a locale is still being translated, since a half-finished dictionary is a normal state to be in.
	 * Unused entries only ever warn.
	 *
	 * @defaultValue `false`
	 */
	strict?: boolean
}

const scannedFile = /\.[cm]?[jt]sx?$/

/**
 * Checks every dictionary against the `localization.text` call sites at build time,
 * and reports entries that are missing and entries nothing uses anymore.
 *
 * ```ts
 * import { localizationDictionaryCheck } from '@rooted/localization/vite'
 *
 * plugins: [generateRouteManifest({ ... }), localizationDictionaryCheck(), myAdapter()]
 * ```
 *
 * It needs no options. Call sites are found by following imports back to the `configureLocalization` call,
 * so the instance can be named, renamed or re-exported however you like.
 * The key is built the same way `text` builds it at runtime, so what the check reports is what would render untranslated.
 *
 * Dictionaries are loaded through the locale token when the route manifest has a route using `localization.parameter`.
 * Without one, they're read from source, which only works for `translation('literal key', ...)` entries.
 *
 * It only sees what's in the build: a module Vite doesn't pull in isn't checked,
 * and neither is `text` reached some other way than a plain import, re-export or destructure (passed as an argument, stored on an object).
 * Nothing runs in `vite dev`; the `[i18n missing]` marker covers that.
 */
export function localizationDictionaryCheck(options: DictionaryCheckOptions = {}): Plugin {
	const scans = new Map<string, ModuleScan>()
	let root = process.cwd()
	let manifestApi: RouteManifestApi | undefined

	function display(id: string): string {
		return path.relative(root, id).replaceAll('\\', '/')
	}

	return {
		name: 'vite-plugin:rooted-localization-dictionary-check',
		apply: 'build',
		// Once per build is enough, other environments would repeat the report
		applyToEnvironment: environment => environment.name === 'client',

		configResolved(config) {
			root = config.root
			const manifestPlugin = config.plugins.find(plugin => plugin.name === routeManifestPluginName)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
		},

		buildStart() {
			scans.clear()
		},

		// Before other transforms, so positions point into the source as written
		transform: {
			order: 'pre',
			handler(code, id) {
				if (id.includes('?') || id.startsWith('\0') || id.includes('/node_modules/') || !scannedFile.test(id)) return
				try {
					scans.set(id, scanModule(code, id))
				}
				catch {
					// Not parseable as-is, the build reports that on its own
				}
			},
		},

		async buildEnd(error) {
			if (error) return

			const resolved = new Map<string, Promise<string | undefined>>()
			const resolve: Resolve = (source, importer) => {
				const key = `${importer}\u0000${source}`
				let result = resolved.get(key)
				if (!result) {
					result = this.resolve(source, importer).then(target => target && !target.external ? target.id : undefined)
					resolved.set(key, result)
				}
				return result
			}

			const instances = await linkSites(scans, resolve)
			const tokens = collectLocaleTokenInfos(manifestApi)
			const missing: string[] = []

			for (const instance of instances) {
				const { entries, notes } = await readEntries(instance, instances.length, { scans, resolve, tokens, display })
				for (const note of notes) this.warn(note)

				for (const localeEntries of entries) {
					const report = compareEntries(instance.sites, localeEntries)
					if (report.missing.length > 0) missing.push(formatMissing(report, display))
					if (report.unused.length > 0) this.warn(formatUnused(report, display))
				}
			}

			if (missing.length === 0) return
			if (options.strict) this.error(missing.join('\n'))
			for (const message of missing) this.warn(message)
		},
	}
}
