import { defineConfig } from 'eslint/config'

import type { Rule } from 'eslint'

type NodeWithSource = { source?: (Rule.Node & { raw?: string }) | null }

const mjsToMts: Rule.RuleModule = {
	meta: {
		type: 'suggestion',
		fixable: 'code',
		schema: [],
		messages: { rewrite: 'Use .mts extension instead of .mjs.' },
	},
	create(context: Rule.RuleContext): Rule.RuleListener {
		function check(node: NodeWithSource): void {
			const raw = node.source?.raw
			if (!raw?.endsWith('.mjs\'') && !raw?.endsWith('.mjs"')) return
			context.report({
				node: node.source,
				messageId: 'rewrite',
				fix: (fixer: Rule.RuleFixer) =>
					fixer.replaceText(node.source!, raw.replace(/\.mjs(['"])$/, '.mts$1')),
			})
		}
		return {
			ImportDeclaration: check,
			ExportNamedDeclaration: check,
			ExportAllDeclaration: check,
		} as unknown as Rule.RuleListener
	},
}

const utf8Encoding: Rule.RuleModule = {
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

export const lintCustom = defineConfig([
	{
		files: ['**/*.{mts,cts}'],
		plugins: {
			local: { rules: { 'mjs-to-mts': mjsToMts, 'utf-encoding': utf8Encoding } },
		},
		rules: {
			'local/mjs-to-mts': 'error',
			'local/utf-encoding': 'error',
		},
	},
])
