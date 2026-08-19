import { isDevelopment } from '@rooted/util/dev'

/**
 * A single dictionary entry: the default-language key and its translated
 * value. Built by {@link translation}.
 */
export type Translation = readonly [key: string, value: string]

/**
 * The translations for one locale. Built by {@link dictionary}, which
 * locale it belongs to is decided by its key in the `dictionaries` record
 * of `configureLocalization`.
 */
export type Dictionary = readonly Translation[]

/** The module shape of a dictionary file: `export default dictionary(...)`. */
export type DictionaryModule = { default: Dictionary }

/**
 * Lazily loads one locale's dictionary. Write it as a dynamic import so the
 * bundler splits each locale into its own chunk:
 * `'nl-NL': () => import('./dictionaries/nl-NL.mts')`.
 */
export type DictionaryLoader = () => Promise<DictionaryModule>

/** @internal A parsed placeholder string: the text parts and the parameter names between them. */
export type ParsedTemplate = {
	parts: readonly string[]
	names: readonly string[]
}

/** @internal A compiled dictionary entry: the key's parameter names plus the parsed value. */
export type CompiledEntry = {
	keyNames: readonly string[]
	value: ParsedTemplate
}

/**
 * Pairs a default-language key with its translated counterpart. Parameters
 * are written as `{name}` placeholders; literal braces are escaped as `{{`
 * and `}}`.
 *
 * The translation may reorder the key's parameters (or leave some out). In
 * development, a translation referencing a name the key doesn't declare
 * logs a console warning when the localization is configured.
 *
 * @example
 * ```ts
 * translation('hello {lastName}, {firstName}', 'hallo {firstName} {lastName}')
 * ```
 *
 * @see {@link dictionary}
 */
export function translation(key: string, value: string): Translation {
	return [key, value]
}

/**
 * Bundles translations into a dictionary. Meant as the default export of a
 * dictionary file, one file per locale; the locale itself is the key in the
 * `dictionaries` record of `configureLocalization`.
 *
 * @example
 * ```ts
 * // src/_shared/i18n/dictionaries/nl-NL.mts
 * export default dictionary(
 *   translation('this is an example label', 'dit is een voorbeeld label'),
 * )
 * ```
 *
 * @see {@link translation}
 */
export function dictionary(...translations: Translation[]): Dictionary {
	return translations
}

/**
 * @internal Parses a placeholder string into text parts and parameter names.
 * `{{` and `}}` unescape to literal braces. A `{` without a closing `}` is
 * treated as literal text.
 */
export function parseTemplate(text: string): ParsedTemplate {
	const parts: string[] = []
	const names: string[] = []
	let current = ''
	let index = 0

	while (index < text.length) {
		const char = text[index]
		if (char === '{') {
			if (text[index + 1] === '{') {
				current += '{'
				index += 2
				continue
			}
			const end = text.indexOf('}', index)
			if (end === -1) {
				current += text.slice(index)
				break
			}
			parts.push(current)
			names.push(text.slice(index + 1, end))
			current = ''
			index = end + 1
			continue
		}
		if (char === '}' && text[index + 1] === '}') {
			current += '}'
			index += 2
			continue
		}
		current += char
		index++
	}

	parts.push(current)
	return { parts, names }
}

// The text call site only has positional values, no parameter names. The
// lookup key therefore erases names: just the text parts, joined with a
// character that cannot appear in template text.
const lookupSeparator = '\u0000'

/** @internal Builds the name-erased lookup key for a set of template text parts. */
export function lookupKey(parts: ArrayLike<string>): string {
	// eslint-disable-next-line unicorn/prefer-spread
	return Array.from(parts).join(lookupSeparator)
}

/**
 * @internal Compiles one locale's dictionary, keyed by lookup key. Runs when
 * the dictionary chunk loads. In development, warns for translations that
 * reference parameter names their key doesn't declare.
 */
export function compileDictionary(locale: string, translations: Dictionary): Map<string, CompiledEntry> {
	const entries = new Map<string, CompiledEntry>()

	for (const [key, value] of translations) {
		const parsedKey = parseTemplate(key)
		const parsedValue = parseTemplate(value)

		if (isDevelopment()) {
			for (const name of parsedValue.names) {
				if (parsedKey.names.includes(name)) continue
				const declared = parsedKey.names.length > 0 ? parsedKey.names.map(known => `{${known}}`).join(', ') : 'no parameters'
				console.warn(`[@rooted/localization] ${locale}: translation "${value}" references unknown parameter "{${name}}" (key "${key}" declares ${declared})`)
			}
		}

		entries.set(lookupKey(parsedKey.parts), {
			keyNames: parsedKey.names,
			value: parsedValue,
		})
	}

	return entries
}
