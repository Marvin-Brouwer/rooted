import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/_module/*.mts'],
	format: ['esm'],
	platform: 'browser',
	treeshake: { moduleSideEffects: 'no-external' },
	dts: true,
	clean: true,
	sourcemap: true,
	shims: true,
	cjsInterop: true,
})
