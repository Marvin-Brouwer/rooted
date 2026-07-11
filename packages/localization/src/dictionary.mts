import { isDevelopment } from '@rooted/util/dev'

declare const phraseNames: unique symbol

/**
 * A placeholder string built by {@link template}, carrying its parameter
 * names at the type level. At runtime it's a plain string like
 * `'hello {lastName}, {firstName}'`.
 */
export type Phrase<N extends string = never> = string & { readonly [phraseNames]: N }

/**
 * A single dictionary entry: the default-language key and its translated
 * value. Built by {@link translation}.
 */
export type Translation = readonly [key: string, value: string]

/**
 * A locale paired with its translations. Built by {@link dictionary} and
 * passed to `configureLocalization` in the `dictionaries` array.
 */
export type Dictionary<TLocale extends string = string> = readonly [locale: TLocale, translations: readonly Translation[]]

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

const validName = /^[A-Za-z_$][\w$-]*$/

/**
 * Tagged template for the two sides of a {@link translation}. Interpolate
 * parameter names as strings; the names are carried in the type, so the
 * translated side can only use names the key side declares.
 *
 * @example
 * ```ts
 * template`hello ${'lastName'}, ${'firstName'}`
 * ```
 *
 * @see {@link translation}
 */
export function template<const N extends readonly string[]>(strings: TemplateStringsArray, ...names: N): Phrase<N[number]> {
	if (isDevelopment()) {
		for (const name of names) {
			if (!validName.test(name))
				console.warn(`[@rooted/localization] invalid template parameter name "${name}"`)
		}
	}

	// eslint-disable-next-line unicorn/no-array-reduce
	return [...strings].reduce((accumulator, part, index) =>
		index === 0 ? escapeBraces(part) : `${accumulator}{${names[index - 1]}}${escapeBraces(part)}`, '') as Phrase<N[number]>
}

function escapeBraces(text: string): string {
	return text.replaceAll('{', '{{').replaceAll('}', '}}')
}

/**
 * Pairs a default-language {@link template} with its translated counterpart.
 *
 * The translation may reorder the key's parameters (or leave some out), but
 * referencing a name the key doesn't declare is a compile error.
 *
 * @example
 * ```ts
 * translation(
 *   template`hello ${'lastName'}, ${'firstName'}`,
 *   template`hallo ${'firstName'} ${'lastName'}`,
 * )
 * ```
 *
 * @see {@link dictionary}
 */
export function translation<N extends string, M extends N>(key: Phrase<N>, value: Phrase<M>): Translation {
	return [key, value]
}

/**
 * Pairs a locale with its translations. Meant as the default export of a
 * dictionary file, one file per locale:
 *
 * @example
 * ```ts
 * // src/_shared/i18n/dictionaries/nl-NL.mts
 * export default dictionary('nl-NL', [
 *   translation(template`this is an example label`, template`dit is een voorbeeld label`),
 * ])
 * ```
 *
 * @see {@link translation}
 */
export function dictionary<const TLocale extends string>(locale: TLocale, translations: readonly Translation[]): Dictionary<TLocale> {
	return [locale, translations]
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

/** @internal Compiles all dictionaries once, keyed by locale, then by lookup key. */
export function compileDictionaries(dictionaries: readonly Dictionary[]): Map<string, Map<string, CompiledEntry>> {
	const compiled = new Map<string, Map<string, CompiledEntry>>()

	for (const [locale, translations] of dictionaries) {
		const entries = compiled.get(locale) ?? new Map<string, CompiledEntry>()
		for (const [key, value] of translations) {
			const parsedKey = parseTemplate(key)
			entries.set(lookupKey(parsedKey.parts), {
				keyNames: parsedKey.names,
				value: parseTemplate(value),
			})
		}
		compiled.set(locale, entries)
	}

	return compiled
}
