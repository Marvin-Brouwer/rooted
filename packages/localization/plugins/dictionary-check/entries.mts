import type { LinkedInstance, Resolve } from './link.mts'
import type { ModuleScan } from './scan.mts'

/** One locale's dictionary keys: lookup key to the key as written. */
export type LocaleEntries = {
	locale: string
	keys: ReadonlyMap<string, string>
	file: string
}

export type EntrySources = {
	scans: ReadonlyMap<string, ModuleScan>
	resolve: Resolve
	/** Formats a module id for a message. */
	display: (id: string) => string
}

/**
 * Reads the dictionaries of one instance from their source. Keys are the default-language text as written,
 * so they're string literals; one that isn't can't be read and is left out, with a note saying so.
 * Anything else that can't be read ends up in `notes` too, rather than being reported as missing or unused.
 */
export async function readEntries(instance: LinkedInstance, sources: EntrySources) {
	const entries: LocaleEntries[] = []
	const notes: string[] = []
	const where = `${sources.display(instance.id)}:${instance.line}:${instance.column}`

	if (!instance.complete) {
		notes.push(`the dictionaries of configureLocalization at ${where} aren't all written as \`'locale': () => import('./file')\`, so those aren't checked.`)
	}

	for (const [locale, specifier] of instance.dictionaries) {
		if (locale === instance.defaultLocale) continue
		const file = await sources.resolve(specifier, instance.id)
		const dictionary = file === undefined ? undefined : sources.scans.get(file)?.dictionary
		if (file === undefined || !dictionary) {
			notes.push(`${locale}: couldn't read the dictionary for configureLocalization at ${where}, so it isn't checked.`)
			continue
		}
		if (dictionary.unreadable > 0) {
			const count = dictionary.unreadable === 1 ? '1 entry has' : `${dictionary.unreadable} entries have`
			notes.push(`${locale}: ${count} a key that isn't a string literal in ${sources.display(file)}, so ${dictionary.unreadable === 1 ? 'it isn\'t' : 'they aren\'t'} checked.`)
		}
		entries.push({ locale, file, keys: dictionary.keys })
	}

	return { entries, notes }
}
