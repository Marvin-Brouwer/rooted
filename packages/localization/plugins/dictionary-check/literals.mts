import { translationKey } from '../../src/dictionary.mts'

import { stringValue, unwrap } from './ast.mts'

import type { ESTree } from 'vite'

/** The entries of a dictionary module as far as they can be read from source. */
export type StaticDictionary = {
	/** Lookup key to the key as written. */
	keys: Map<string, string>
	/** Entries whose key isn't a string literal, so they can't be checked from source. */
	unreadable: number
}

/**
 * Reads the keys of a `dictionary(translation('key', 'value'), ...)` call into `into`.
 * `isTranslation` says whether a call is the package's `translation`, whatever it was imported as.
 */
export function readDictionaryCall(
	call: ESTree.CallExpression,
	isTranslation: (call: ESTree.CallExpression) => boolean,
	into: StaticDictionary,
): void {
	for (const argument of call.arguments) {
		const entry = argument.type === 'SpreadElement' ? undefined : unwrap(argument)
		const key = entry?.type === 'CallExpression' && isTranslation(entry) ? stringValue(entry.arguments[0]) : undefined
		if (key === undefined) {
			into.unreadable++
			continue
		}
		into.keys.set(translationKey(key), key)
	}
}
