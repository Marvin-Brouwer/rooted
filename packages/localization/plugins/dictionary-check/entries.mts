import { translationKey } from '../../src/dictionary.mts'

import type { LocaleTokenInfo } from '../../src/locale-token.mts'
import type { LinkedInstance, Resolve } from './link.mts'
import type { ModuleScan } from './scan.mts'

/** One locale's dictionary keys: lookup key to the key as written. */
export type LocaleEntries = {
	locale: string
	keys: ReadonlyMap<string, string>
	/** The dictionary module, when it could be resolved. */
	file: string | undefined
}

export type EntrySources = {
	scans: ReadonlyMap<string, ModuleScan>
	resolve: Resolve
	/** Locale tokens from the route manifest, empty without one. */
	tokens: readonly LocaleTokenInfo[]
	/** Formats a module id for a message. */
	display: (id: string) => string
}

/**
 * Reads every dictionary of one instance. Evaluated entries through the matching locale token come first,
 * since they hold whatever the dictionary module computed. Without one, the keys are read from the dictionary module's source.
 * Whatever can't be read either way ends up in `notes` rather than being reported as missing or unused.
 */
export async function readEntries(instance: LinkedInstance, instanceCount: number, sources: EntrySources) {
	const entries: LocaleEntries[] = []
	const notes: string[] = []
	const where = `${sources.display(instance.id)}:${instance.line}:${instance.column}`

	const token = matchToken(instance, instanceCount, sources.tokens)
	const locales = token
		? token.locales.filter(locale => locale !== token.defaultLocale)
		: [...instance.dictionaries.keys()].filter(locale => locale !== instance.defaultLocale)
	if (!token && !instance.complete) {
		notes.push(`the dictionaries of configureLocalization at ${where} can't all be read from source. Add generateRouteManifest with a route using localization.parameter so the check can load them instead.`)
	}

	for (const locale of locales) {
		const specifier = instance.dictionaries.get(locale)
		const file = specifier === undefined ? undefined : await sources.resolve(specifier, instance.id)

		const evaluated = await token?.readDictionary(locale)
		if (evaluated) {
			entries.push({ locale, file, keys: new Map(evaluated.map(([key]) => [translationKey(key), key])) })
			continue
		}

		const dictionary = file === undefined ? undefined : sources.scans.get(file)?.dictionary
		if (file === undefined || !dictionary) {
			notes.push(`${locale}: couldn't read the dictionary for configureLocalization at ${where}, so it isn't checked.`)
			continue
		}
		if (dictionary.unreadable > 0) {
			const count = dictionary.unreadable === 1 ? '1 entry has' : `${dictionary.unreadable} entries have`
			notes.push(`${locale}: ${count} a key that isn't a string literal in ${sources.display(file)}, so ${dictionary.unreadable === 1 ? 'it isn\'t' : 'they aren\'t'} checked and may cover some of the missing entries.`)
		}
		entries.push({ locale, file, keys: dictionary.keys })
	}

	return { entries, notes }
}

// Tokens don't know which module configured them, so they're matched on the
// locales. With a single instance and a single token there's nothing to match.
function matchToken(instance: LinkedInstance, instanceCount: number, tokens: readonly LocaleTokenInfo[]): LocaleTokenInfo | undefined {
	if (instanceCount === 1 && tokens.length === 1) return tokens[0]
	if (!instance.complete || instance.defaultLocale === undefined) return undefined

	const locales = new Set([instance.defaultLocale, ...instance.dictionaries.keys()])
	const matches = tokens.filter(token =>
		token.defaultLocale === instance.defaultLocale
		&& token.locales.length === locales.size
		&& token.locales.every(locale => locales.has(locale)))
	return matches.length === 1 ? matches[0] : undefined
}
