import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/index.mts', 'src/middleware.mts'],
	format: ['esm'],
	platform: 'node',
	treeshake: { moduleSideEffects: 'no-external' },
	dts: true,
	clean: true,
	sourcemap: 'inline',
})
