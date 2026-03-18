import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export const lintJs = defineConfig([
	{
		plugins: {
			js,
		},
	},
	js.configs.recommended,
])

const tsFiles = ['**/*.{ts,mts,cts,tsx}']

export const lintTs = defineConfig([
	// eslint-disable-next-line import/no-named-as-default-member
	...tseslint.configs.recommendedTypeChecked.map(config => ({ ...config, files: tsFiles })),
	{
		files: tsFiles,
		languageOptions: {
			parserOptions: {
				project: [
					'./packages/*/tsconfig.json',
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
		},
	},
])
