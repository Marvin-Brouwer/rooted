import { defineConfig } from 'tsdown'

import { inheritdocPlugin } from '@rooted/tsdown'

export default defineConfig([
	{
		entry: ['src/_module/*.mts'],
		format: ['esm'],
		platform: 'browser',
		treeshake: { moduleSideEffects: 'no-external' },
		dts: true,
		clean: true,
		sourcemap: 'inline',
		onSuccess: 'rooted-development extract-api',
		plugins: [inheritdocPlugin()],
	},
	{
		entry: ['plugins/_module/*.mts'],
		format: ['esm'],
		platform: 'node',
		treeshake: { moduleSideEffects: 'no-external' },
		tsconfig: 'tsconfig.plugin.json',
		deps: { neverBundle: ['esbuild'] },
		dts: true,
		clean: true,
		sourcemap: 'inline',
	},
])
