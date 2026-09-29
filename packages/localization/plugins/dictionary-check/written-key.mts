import { bindingPath } from './ast.mts'

import type { ESTree } from 'vite'

/**
 * Writes a `text` call site the way its dictionary key would be written, so a report line can be pasted into `translation(...)`.
 * Placeholders are named after their expression: `${lastName}` and `${user.lastName}` both become `{lastName}`.
 * Anything else, or a name that's already taken, gets its position instead: `{0}`.
 * Literal braces are escaped, so the result parses back to the same lookup key.
 */
export function writtenKey(parts: readonly string[], expressions: readonly ESTree.Expression[]): string {
	const used = new Set<string>()
	let written = escapeBraces(parts[0])

	for (const [index, expression] of expressions.entries()) {
		const path = bindingPath(expression)
		const named = path ? (path.members.at(-1) ?? path.binding) : undefined
		const name = named === undefined || used.has(named) ? String(index) : named
		used.add(name)
		written += `{${name}}${escapeBraces(parts[index + 1])}`
	}

	return written
}

function escapeBraces(text: string): string {
	return text.replaceAll('{', '{{').replaceAll('}', '}}')
}
