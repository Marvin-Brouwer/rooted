import { defineConfig } from 'tsdown'

export default defineConfig([
	{
		entry: ['src/_module/*.mts'],
		format: ['esm'],
		platform: 'node',
		treeshake: { moduleSideEffects: 'no-external' },
		dts: true,
		clean: true,
		sourcemap: 'inline',
		onSuccess: 'rooted-development extract-api',
	},
	{
		// prerender.mjs starts one of these per page, by path, so it has to be its own file in dist.
		// No declarations: it isn't an entry anyone imports, and extract-api reports every .d.mts it finds.
		entry: { 'render-worker': 'src/renderer/worker.mts' },
		format: ['esm'],
		platform: 'node',
		treeshake: { moduleSideEffects: 'no-external' },
		dts: false,
		clean: false,
		sourcemap: 'inline',
	},
])
