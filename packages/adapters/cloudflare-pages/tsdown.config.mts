import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/index.mts'],
	format: ['esm'],
	platform: 'node',
	treeshake: { moduleSideEffects: 'no-external' },
	dts: true,
	clean: true,
	sourcemap: 'inline',
})
