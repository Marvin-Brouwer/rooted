import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from 'eslint/config'

export const projectConfig = defineConfig([
	stylistic.configs.customize({
		semi: false,
		quotes: 'single',
		indent: 'tab',
	}),
	{
		rules: {
			// eslint-import-resolver-typescript can't resolve https:// URL import specifiers
			// (e.g. Vite virtual modules declared via `declare module 'https://...'`).
			'import-x/no-unresolved': ['error', { ignore: ['^https://'] }],
		},
	},
	{
		rules: {
			'@stylistic/indent-binary-ops': ['off'],
			'@stylistic/indent': ['error', 'tab', { ignoredNodes: ['TSConditionalType', 'TSConditionalType > *'] }],
			'unicorn/prefer-node-protocol': ['error'],
			'unicorn/prevent-abbreviations': ['error', {
				allowList: {
					'dotEnv': true,
					'devHelper': true,
					'dev-helper': true,
					'vite-env': true,
					'vite-env.d': true,
				},
			}],
		},
	},
])
