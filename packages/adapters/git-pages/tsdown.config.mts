import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/_module/*.mts'],
	format: ['esm'],
	platform: 'node',
	treeshake: { moduleSideEffects: 'no-external' },
	dts: true,
	clean: true,
	sourcemap: 'inline',
})
