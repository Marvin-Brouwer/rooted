import { defineConfig, globalIgnores } from 'eslint/config'

import {
	packageJsonPreset,
	scope,
	sharedPresets,
	testOnlyPresets,
} from './index.ts'

const testFiles = [
	'packages/*/tests/**/*.{ts,mts}',
]

export default defineConfig([
	globalIgnores([
		'**/node_modules', '**/dist',
		'docs', 'temp',
		'**/bin/**',
		'**/*.g.d.ts', '**/*.g.mts',
	]),
	...sharedPresets,
	...scope(testFiles, testOnlyPresets),
	...packageJsonPreset,
])
