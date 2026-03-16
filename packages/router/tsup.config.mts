import { defineConfig } from 'tsup'
import { dedupeSourcemapsPlugin } from '@rooted/tsup'

export default defineConfig([
	{
		entry: ['src/_module/*.mts', '!src/_module/manifest.mts'],
		format: ['esm'],
		platform: 'browser',
		treeshake: { moduleSideEffects: 'no-external' },
		dts: true,
		clean: true,
		sourcemap: 'inline',
		plugins: [dedupeSourcemapsPlugin()],
	},
	{
		entry: ['src/_module/manifest.mts'],
		format: ['esm'],
		platform: 'node',
		tsconfig: 'tsconfig.plugin.json',
		dts: true,
		sourcemap: 'inline',
		plugins: [dedupeSourcemapsPlugin()],
	},
])
