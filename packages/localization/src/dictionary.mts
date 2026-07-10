import { isDevelopment } from '@rooted/util/dev'

/**
 * An overlay dictionary for one locale. Keys and values are placeholder
 * strings in the format `'hello {name}'`, where `{name}` marks an
 * interpolated parameter. Use {@link template} to build them, or write them
 * by hand. Literal braces are escaped as `{{` and `}}`.
 */
export type Dictionary = Record<string, string>

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
 * Tagged template for dictionary keys and values. Interpolate parameter
 * names as strings; the result is a plain placeholder string, so it works
 * as a computed object key.
 *
 * The translated value may reference the key's parameters in any order,
 * which matters when sentence structure differs between languages.
 *
 * @example
 * ```ts
 * template`hello ${'name'}`  // 'hello {name}'
 *
 * dictionaries: {
 *   'nl-NL': {
 *     [template`hello ${'lastName'}, ${'firstName'}`]: template`hallo ${'firstName'} ${'lastName'}`,
 *   },
 * }
 * ```
 */
export function template(strings: TemplateStringsArray, ...names: string[]): string {
	if (isDevelopment()) {
		for (const name of names) {
			if (!validName.test(name))
				console.warn(`[@rooted/localization] invalid template parameter name "${name}"`)
		}
	}

	// eslint-disable-next-line unicorn/no-array-reduce
	return [...strings].reduce((accumulator, part, index) =>
		index === 0 ? escapeBraces(part) : `${accumulator}{${names[index - 1]}}${escapeBraces(part)}`, '')
}

function escapeBraces(text: string): string {
	return text.replaceAll('{', '{{').replaceAll('}', '}}')
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
export function compileDictionaries(dictionaries: Record<string, Dictionary>): Map<string, Map<string, CompiledEntry>> {
	const compiled = new Map<string, Map<string, CompiledEntry>>()

	for (const [locale, dictionary] of Object.entries(dictionaries)) {
		const entries = new Map<string, CompiledEntry>()
		for (const [key, value] of Object.entries(dictionary)) {
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
