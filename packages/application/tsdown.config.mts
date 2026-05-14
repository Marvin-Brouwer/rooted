import { defineConfig } from 'tsdown'

export default defineConfig([
	{
		entry: ['src/_module/*.mts'],
		format: ['esm'],
		platform: 'browser',
		treeshake: { moduleSideEffects: 'no-external' },
		// node: builtins are imported by Vite-plugin helpers (rootedManifest etc.)
		// that only run at build time in Node.js, never in the browser.
		// Rolldown warns about them in browser mode unless explicitly marked external.
		deps: { neverBundle: [/^node:/] },
		dts: true,
		clean: true,
		sourcemap: 'inline',
		onSuccess: 'rooted-development extract-api',
	},
	{
		entry: ['plugins/_module/*.mts'],
		format: ['esm'],
		platform: 'node',
		treeshake: { moduleSideEffects: 'no-external' },
		tsconfig: 'tsconfig.plugin.json',
		dts: true,
		clean: true,
		sourcemap: 'inline',
	},
])
