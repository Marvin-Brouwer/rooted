import { defineConfig } from 'eslint/config'

/**
 * Relaxations applied to test files.
 *
 * Tests legitimately use null, undefined, any, locally-scoped helpers, and
 * await-then-access patterns that the strict project rules flag elsewhere.
 */
export const lintTests = defineConfig([
	{
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
