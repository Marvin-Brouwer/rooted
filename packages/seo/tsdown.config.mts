import { defineConfig } from 'tsdown'

// Everything here is build-time Node code, so there is no browser build to keep separate.
// One config means both entries share a declaration chunk, see #245.
export default defineConfig({
	entry: ['plugins/_module/*.mts'],
	format: ['esm'],
	platform: 'node',
	treeshake: { moduleSideEffects: 'no-external' },
	tsconfig: 'tsconfig.plugin.json',
	dts: true,
	clean: true,
	sourcemap: 'inline',
	onSuccess: 'rooted-development extract-api',
})
