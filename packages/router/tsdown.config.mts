import { defineConfig } from 'tsdown'

export default defineConfig([
	{
		entry: ['src/_module/*.mts'],
		format: ['esm'],
		platform: 'browser',
		treeshake: { moduleSideEffects: 'no-external' },
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
		// Self-import on purpose, see #245.
		// This is a separate rolldown run, so it can't share a declaration chunk with the build above.
		// Keeping the package external makes `manifest.d.mts` import the route types from the package
		// entry instead of inlining its own copy. The copies would compare nominally (`routeMetadata` is
		// a `unique symbol`, `HrefBase` has a protected member), so routes from `@rooted/router` would
		// stop being assignable to routes from `@rooted/router/manifest`.
		// It does make the order here load-bearing: the build above has to emit its `.d.mts` first.
		external: ['@rooted/router'],
		dts: true,
		clean: true,
		sourcemap: 'inline',
	},
])
