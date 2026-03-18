import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

const jsFiles = ['**/*.{js,mjs,cjs,jsx}']
export const lintJs = defineConfig([
	{
		files: jsFiles,
		plugins: {
			js,
		},
	},
	js.configs.recommended,
	{
		files: ['**/*.{mjs,mts}'],
		languageOptions: {
			sourceType: 'module',
		},
	},
])

const tsFiles = ['**/*.{ts,mts,cts,tsx}']

export const lintTs = defineConfig([
	// eslint-disable-next-line import/no-named-as-default-member
	...tseslint.configs.recommendedTypeChecked.map(config => ({ ...config, files: tsFiles })),
	{
		plugins: {
			// eslint-disable-next-line import/no-named-as-default-member
			'@typescript-eslint': tseslint.plugin,
		},
		files: tsFiles,
		languageOptions: {
			parserOptions: {
				project: [
					'./packages/*/tsconfig.json',
					'./packages/*/tsconfig.plugin.json',
					'./tooling/*/tsconfig.json',
					'./tsconfig.test.json',
					'./tsconfig.config.json',
				],
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/no-unused-vars': ['error', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
			}],
			'@typescript-eslint/switch-exhaustiveness-check': ['error', {
				allowDefaultCaseForExhaustiveSwitch: true,
				considerDefaultExhaustiveForUnions: false,
			}],
			'@typescript-eslint/semi': ['off'],
		},
	},
])
