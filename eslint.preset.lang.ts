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
	// eslint-disable-next-line import-x/no-named-as-default-member
	...tseslint.configs.recommendedTypeChecked.map(config => ({ ...config, files: tsFiles })),
	{
		plugins: {
			// eslint-disable-next-line import-x/no-named-as-default-member
			'@typescript-eslint': tseslint.plugin,
		},
		files: tsFiles,
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['packages/*/tests/*.ts'],
					maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30,
				},
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
