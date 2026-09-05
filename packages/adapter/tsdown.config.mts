import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/index.mts'],
	format: ['esm'],
	platform: 'node',
	treeshake: { moduleSideEffects: 'no-external' },
	// `SeoApi` is used internally and never reaches the emitted declarations.
	// Without this the dts build follows @rooted/seo into vite-plugin-pwa and sharp,
	// whose CommonJS d.ts rolldown cannot bundle.
	external: ['@rooted/seo'],
	dts: true,
	clean: true,
	sourcemap: 'inline',
})
