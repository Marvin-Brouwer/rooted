import { defineConfig } from 'eslint/config'
import importPlugin from 'eslint-plugin-import-x'
import unusedImports from 'eslint-plugin-unused-imports'

import type { Rule } from 'eslint'

type NodeWithSource = { source?: (Rule.Node & { raw?: string }) | null }

const mjsToMts: Rule.RuleModule = {
	meta: {
		type: 'suggestion',
		fixable: 'code',
		messages: {
			rewrite: 'Use .mts extension instead of .mjs',
		},
	},
	create(context: Rule.RuleContext): Rule.RuleListener {
		function check(node: NodeWithSource): void {
			const raw = node.source?.raw
			if (!raw?.endsWith('.mjs\'') && !raw?.endsWith('.mjs"')) return
			context.report({
				node: node.source,
				messageId: 'rewrite',
				fix: (fixer: Rule.RuleFixer) =>
					fixer.replaceText(node.source, raw.replace(/\.mjs(['"])$/, '.mts$1')),
			})
		}
		return {
			ImportDeclaration: check,
			ExportNamedDeclaration: check,
			ExportAllDeclaration: check,
		} as unknown as Rule.RuleListener
	},
}

export const lintImports = defineConfig([
	importPlugin.flatConfigs.recommended,
	importPlugin.flatConfigs.typescript,
	{
		plugins: {
			['unused-imports']: unusedImports,
		},
		rules: {
			// auto-remove unused imports
			'unused-imports/no-unused-imports': 'error',
			// optionally warn about unused vars but allow _ prefix
			'unused-imports/no-unused-vars': [
				'warn',
				{ vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
			],
		},
	},
	{
		files: ['**/*.{mts,cts}'],
		plugins: {
			['local']: { rules: { 'mjs-to-mts': mjsToMts } },
		},
		rules: {
			'local/mjs-to-mts': 'error',
		},
	},
	{
		settings: {
			'import-x/parsers': {
				'@typescript-eslint/parser': ['.ts', '.tsx', '.mts', '.cts', '.d.ts'],
			},
			'import-x/resolver': {
				typescript: {
					alwaysTryTypes: true,
				},
				node: {
					extensions: ['.js', '.jsx'],
					moduleDirectory: ['node_modules', 'src/', 'tests/'],
				},
			},
			'import-x/extensions': ['.js', '.jsx', '.ts', '.tsx', '.mts', '.cts'],

		},
		rules: {
			'import-x/extensions': ['error', 'ignorePackages', {
				mts: 'always',
			}],
			'import-x/order': [
				'error',
				{
					'groups': [
						'builtin', // Node.js builtins
						'external', // npm libs
						'internal', // alias paths, tsconfig paths
						'parent', // ../
						'sibling', // ./same-folder
						'index', // index imports
						'object', // import a namespace
						'type', // import type {...}
					],
					'newlines-between': 'always',
					'alphabetize': {
						order: 'asc',
						caseInsensitive: true,
					},
				},
			],

			// Disable conflicting built-in sorting
			'sort-imports': 'off',
		},
	},
])
