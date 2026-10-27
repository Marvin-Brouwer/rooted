/** What a piece of code is, which decides its colour. `plain` is everything the patterns below don't match. */
export type TokenKind = 'keyword' | 'string' | 'function' | 'type' | 'property' | 'punctuation' | 'plain'

export type Token = {
	kind: TokenKind
	text: string
}

/**
 * Good enough for the banner's code, not a TypeScript tokenizer.
 * Types are recognised by name: `string` and anything ending in `Options`.
 */
const pattern = /(?<string>'[^']*')|(?<keyword>\b(?:import|from|type|export|const)\b)|(?<type>\b(?:string|[A-Z][A-Za-z]*Options)\b)|(?<function>\b[a-zA-Z_]\w*(?=[(<]))|(?<property>\b[a-zA-Z_]\w*(?=:))|(?<punctuation>[{}()[\],<>=:.])/g

/**
 * Splits one line of code into coloured tokens.
 *
 * @example
 * ```ts
 * highlight("name: 'article-card',")
 * // property `name`, punctuation `:`, plain ` `, string `'article-card'`, punctuation `,`
 * ```
 */
export function highlight(line: string): Token[] {
	const tokens: Token[] = []
	let position = 0

	for (const match of line.matchAll(pattern)) {
		if (match.index > position) tokens.push({ kind: 'plain', text: line.slice(position, match.index) })

		const kind = Object.entries(match.groups!).find(([, value]) => value !== undefined)![0] as TokenKind
		tokens.push({ kind, text: match[0] })
		position = match.index + match[0].length
	}

	if (position < line.length) tokens.push({ kind: 'plain', text: line.slice(position) })
	return tokens
}
