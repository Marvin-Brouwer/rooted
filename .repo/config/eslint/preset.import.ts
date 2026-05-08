import { defineConfig } from 'eslint/config'
import { flatConfigs } from 'eslint-plugin-import-x'
import unusedImports from 'eslint-plugin-unused-imports'

export const lintImports = defineConfig([
	flatConfigs.recommended,
	flatConfigs.typescript,
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
		settings: {
			'import-x/parsers': {
				'@typescript-eslint/parser': ['.ts', '.tsx', '.mts', '.cts', '.d.ts'],
			},
			'import-x/resolver': {
				typescript: {
					alwaysTryTypes: true,
					// Prefer the `source` export condition for packages that declare
					// it. Mirrors the customConditions in .repo/config/ts/library.json,
					// so lint resolves through source files where available.
					conditionNames: ['source', 'import', 'require', 'node', 'default'],
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
