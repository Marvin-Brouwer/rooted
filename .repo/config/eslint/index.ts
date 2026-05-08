import stylistic from '@stylistic/eslint-plugin'
import unicorn from 'eslint-plugin-unicorn'

import { lintCustom } from './preset.custom.ts'
import { lintImports } from './preset.import.ts'
import { lintJs, lintTs } from './preset.lang.ts'
import { lintPackageJson } from './preset.packagejson.ts'
import { projectConfig } from './preset.project.ts'
import { lintTests } from './preset.tests.ts'

import type { Linter } from 'eslint'

export { lintCustom } from './preset.custom.ts'
export { lintImports } from './preset.import.ts'
export { lintJs, lintTs } from './preset.lang.ts'
export { lintPackageJson } from './preset.packagejson.ts'
export { projectConfig } from './preset.project.ts'
export { lintTests } from './preset.tests.ts'

/**
 * Applied to every linted file. Language rules, stylistic, unicorn, imports,
 * custom rules, and project-wide overrides.
 */
export const sharedPresets = [
	lintJs,
	lintTs,
	stylistic.configs.recommended,
	unicorn.configs.recommended,
	lintImports,
	lintCustom,
	projectConfig,
]

/**
 * Test-only override. Disables a handful of unicorn nags that are too strict
 * for test code. Add or remove rules here to tune test linting in one place.
 */
export const testOnlyPresets = [
	lintTests,
]

/**
 * package.json validation. Self-scoped to `packages/<star>/package.json` by
 * the underlying preset, so apply directly without a `scope` wrapper.
 */
export const packageJsonPreset = [
	lintPackageJson,
]

/**
 * Bind a preset bundle to a glob set. Flattens nested config arrays and
 * stamps `files` onto every leaf so the bundle only applies under that glob.
 */
export function scope(files: string[], presets: unknown[]): Linter.Config[] {
	return (presets.flat(Number.POSITIVE_INFINITY) as Linter.Config[])
		.filter((c): c is Linter.Config => typeof c === 'object' && c !== null)
		.map(c => ({ ...c, files }))
}
