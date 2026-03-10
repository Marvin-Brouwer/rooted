import { defineConfig } from 'tsup'

export default defineConfig([
	{
		entry: ['src/_module/router.mts'],
		format: ['esm'],
		platform: 'browser',
		treeshake: { moduleSideEffects: 'no-external' },
		dts: true,
		clean: true,
		sourcemap: 'inline',
		shims: true,
		cjsInterop: true,
	},
	{
		entry: ['src/_module/manifest.mts'],
		format: ['esm'],
		platform: 'node',
		tsconfig: 'tsconfig.plugin.json',
		dts: true,
		sourcemap: 'inline',
	},
])
