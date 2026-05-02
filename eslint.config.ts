import stylistic from '@stylistic/eslint-plugin'
import { Config, defineConfig, globalIgnores } from 'eslint/config'
import unicorn from 'eslint-plugin-unicorn'
import globals from 'globals'

import { lintCustom } from './eslint.preset.custom.ts'
import { lintImports } from './eslint.preset.import.ts'
import { lintJs, lintTs } from './eslint.preset.lang.ts'
import { lintPackageJson } from './eslint.preset.packagejson.ts'
import { projectConfig } from './eslint.preset.project.ts'

export default defineConfig([
	globalIgnores([
		'**/node_modules',
		'**/dist', 'docs',
		'temp', '**/bin/**',
		'**/*.g.d.ts', '**/*.g.mts',
	]),
	configureFiles([
		'eslint.*.ts',
		'**/*.mts',
		'**/*.mjs',
	]),
	lintJs,
	lintTs,
	stylistic.configs.recommended,
	unicorn.configs.recommended,
	lintCustom,
	lintImports,
	lintPackageJson,
	projectConfig,
	{
		files: ['packages/*/tests/**/*.ts'],
		rules: {
			'unicorn/no-null': 'off',
			'unicorn/no-useless-undefined': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'unicorn/consistent-function-scoping': 'off',
			'unicorn/no-await-expression-member': 'off',
			'@typescript-eslint/unbound-method': 'off',
		},
	},
])

function configureFiles(files: Config['files']): Config {
	return {
		files,
		languageOptions: {
			globals: globals.es2015,
			sourceType: 'module',
		},
	}
}
