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

export default {
	meta: { name: 'local', version: '0.0.1' },
	rules: {
		'mjs-to-mts': mjsToMts,
		'utf-encoding': utf8Encoding,
	},
}
