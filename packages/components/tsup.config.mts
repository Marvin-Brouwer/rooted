import { defineConfig } from 'tsup'
import { inheritdocPlugin } from '@rooted/tsup'

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
		entry: ['plugin/css-loader.mts'],
		format: ['esm'],
		platform: 'node',
		tsconfig: 'tsconfig.plugin.json',
		dts: true,
		sourcemap: 'inline',
	},
])
