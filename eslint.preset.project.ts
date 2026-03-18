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
			'@stylistic/indent-binary-ops': ['off'],
			'@stylistic/indent': ['error', 'tab', { ignoredNodes: ['TSConditionalType', 'TSConditionalType > *'] }],
			'unicorn/prefer-node-protocol': ['error'],
			'unicorn/prevent-abbreviations': ['error', {
				allowList: {
					dotEnv: true,
					devHelper: true,
				},
			}],
		},
	},
])
