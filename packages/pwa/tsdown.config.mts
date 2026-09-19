import { defineConfig } from 'tsdown'

export default defineConfig([
	{
		entry: ['src/_module/pwa.mts'],
		format: ['esm'],
		platform: 'browser',
		treeshake: { moduleSideEffects: 'no-external' },
		dts: true,
		clean: true,
		sourcemap: 'inline',
		onSuccess: 'rooted-development extract-api',
	},
	{
		entry: ['src/_module/components.mts'],
		format: ['esm'],
		platform: 'browser',
		treeshake: { moduleSideEffects: 'no-external' },
		// Separate run on purpose, and the order matters: the build above has to emit first.
		// `@rooted/application` copies `dist/pwa.mjs` into the build output as the registration
		// script, so that file has to stay a single self-contained module. One run with both
		// entries would hoist what they share into a chunk they both import, which breaks it.
		deps: { neverBundle: ['@rooted/pwa'] },
		dts: true,
		clean: true,
		sourcemap: 'inline',
	},
])
