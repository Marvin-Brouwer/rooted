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
		plugins: [inheritdocPlugin()],
	},
	{
		entry: ['plugins/_module/*.mts'],
		format: ['esm'],
		platform: 'node',
		treeshake: { moduleSideEffects: 'no-external' },
		tsconfig: 'tsconfig.plugin.json',
		external: ['esbuild'],
		dts: true,
		clean: true,
		sourcemap: 'inline',
	},
])
