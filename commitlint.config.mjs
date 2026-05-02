/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// Disallow 'refactor'
		// — use 'chore' for internal restructuring that has no observable behavior change,
		// or 'fix'/'feat'/'feat!'/'BREAKING' when it does.
		'type-enum': [
			2,
			'always',
			['feat', 'fix', 'docs', 'test', 'chore', 'ci', 'perf', 'revert'],
		],
		'header-max-length': [0],
	},
}
