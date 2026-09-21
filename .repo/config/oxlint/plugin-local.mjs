// Custom Oxlint JS plugin containing project-specific rules.
// Loaded via jsPlugins in .oxlintrc.json.

/** @type {import('eslint').Rule.RuleModule} */
const mjsToMts = {
	meta: {
		type: 'suggestion',
		fixable: 'code',
		schema: [],
		messages: { rewrite: 'Use .mts extension instead of .mjs.' },
	},
	create(context) {
		function check(node) {
			const raw = node.source?.raw
			if (!raw?.endsWith('.mjs\'') && !raw?.endsWith('.mjs"')) return
			context.report({
				node: node.source,
				messageId: 'rewrite',
				fix: (fixer) =>
					fixer.replaceText(node.source, raw.replace(/\.mjs(['"])$/, '.mts$1')),
			})
		}
		return {
			ImportDeclaration: check,
			ExportNamedDeclaration: check,
			ExportAllDeclaration: check,
		}
	},
}

/** @type {import('eslint').Rule.RuleModule} */
const utf8Encoding = {
	meta: {
		type: 'suggestion',
		fixable: 'code',
		schema: [],
		messages: { prefer: 'Prefer `utf8` over `utf-8`.' },
	},
	create(context) {
		return {
			Literal(node) {
				if (typeof node.value !== 'string') return
				if (node.value.toLowerCase() !== 'utf-8') return
				context.report({
					node,
					messageId: 'prefer',
					fix(fixer) {
						const source = context.sourceCode.getText(node)
						return fixer.replaceText(node, source.replace('utf-8', 'utf8'))
					},
				})
			},
		}
	},
}

// CLAUDE.md asks for prose to be wrapped by paragraph, not by column, and that goes for
// comments as well as markdown. This rule catches the hard wrap: a prose line that stops
// mid-sentence with more of the same paragraph on the line below.
//
// There is no autofix. Joining two lines is easy to get wrong around fences and tags, and
// the right join is sometimes a rewrite rather than a merge.
//
// Block comments only. A run of `//` lines is usually a note next to code, and often code
// that was commented out, so the same check there costs more in false positives than it buys.

// A block comment line only counts as prose when it isn't one of these.
const FENCE = /^\s*(?:```|~~~)/
const TAG = /^@\w/
const LIST = /^(?:[*+-]|\d+[.)]|>)\s/
const TABLE = /^\|/
const HEADING = /^#{1,6}\s/
const LINK_DEFINITION = /^\[[^\]]+]:\s/
/** Punctuation a wrapped line is allowed to break after. */
const BREAKS_AFTER = /[.,;:!?]$/
/** A trailing backslash is markdown's hard line break, so the author meant it. */
const HARD_BREAK = /\\$/

/** Drop the ` * ` gutter from one raw line of a block comment. */
function withoutGutter(raw) {
	const gutter = /^\s*\*[ \t]?/.exec(raw)
	return gutter ? raw.slice(gutter[0].length) : raw.replace(/^\s?/, '')
}

/**
 * Label every line of a block comment,
 * so the rule can tell prose from the things that are allowed to end wherever they like.
 * Indented lines inherit the label above them,
 * which is what keeps a wrapped list item or an indented code line out of the prose bucket.
 */
function classify(value) {
	const labelled = []
	let inFence = false
	let inExample = false
	let previous = 'blank'

	for (const raw of value.split('\n')) {
		const text = withoutGutter(raw)
		const trimmed = text.trim()
		let kind

		if (FENCE.test(text)) {
			inFence = !inFence
			kind = 'fence'
		} else if (inFence) kind = 'fence'
		else if (TAG.test(trimmed)) {
			inExample = trimmed.startsWith('@example')
			kind = 'tag'
		} else if (inExample) kind = 'example'
		else if (trimmed === '') kind = 'blank'
		else if (/^\s/.test(text) && previous !== 'blank' && previous !== 'prose') kind = previous
		else if (LIST.test(trimmed)) kind = 'list'
		else if (TABLE.test(trimmed)) kind = 'table'
		else if (HEADING.test(trimmed)) kind = 'heading'
		else if (LINK_DEFINITION.test(trimmed)) kind = 'link'
		else kind = 'prose'

		labelled.push({ raw, trimmed, kind })
		previous = kind
	}

	return labelled
}

/** @type {import('eslint').Rule.RuleModule} */
const commentLineWrap = {
	meta: {
		type: 'suggestion',
		schema: [],
		messages: {
			wrapped: 'Comment line is wrapped mid-sentence. Keep the paragraph on one line, or break after punctuation.',
		},
	},
	create(context) {
		return {
			Program(program) {
				for (const comment of program.comments) {
					if (comment.type !== 'Block') continue

					const lines = classify(comment.value)
					// `+ 2` skips the `/*` that `value` doesn't include.
					let offset = comment.start + 2

					for (const [index, line] of lines.entries()) {
						const start = offset
						offset += line.raw.length + 1

						if (line.kind !== 'prose') continue
						if (BREAKS_AFTER.test(line.trimmed) || HARD_BREAK.test(line.trimmed)) continue
						// The last line of a paragraph has nothing after it to have been wrapped from.
						if (lines[index + 1]?.kind !== 'prose') continue

						const indent = line.raw.length - line.raw.trimStart().length
						context.report({
							messageId: 'wrapped',
							loc: {
								start: context.sourceCode.getLocFromIndex(start + indent),
								end: context.sourceCode.getLocFromIndex(start + line.raw.trimEnd().length),
							},
						})
					}
				}
			},
		}
	},
}

export default {
	meta: { name: 'local', version: '0.0.1' },
	rules: {
		'comment-line-wrap': commentLineWrap,
		'mjs-to-mts': mjsToMts,
		'utf-encoding': utf8Encoding,
	},
}
