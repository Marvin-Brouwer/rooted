import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: {
		alias: [
			// More specific aliases first
			{
				find: '@rooted/util/dev',
				replacement: fileURLToPath(new URL('packages/util/src/_module/dev.mts', import.meta.url)),
			},
			{
				find: '@rooted/util',
				replacement: fileURLToPath(new URL('packages/util/src/_module/util.mts', import.meta.url)),
			},
			{
				find: '@rooted/store',
				replacement: fileURLToPath(new URL('packages/store/src/_module/store.mts', import.meta.url)),
			},
			{
				find: '@rooted/storage/web',
				replacement: fileURLToPath(new URL('packages/storage/src/_module/web.mts', import.meta.url)),
			},
			{
				find: '@rooted/events',
				replacement: fileURLToPath(new URL('packages/events/src/_module/events.mts', import.meta.url)),
			},
			{
				find: '@rooted/elements/events',
				replacement: fileURLToPath(new URL('packages/elements/src/_module/events.mts', import.meta.url)),
			},
			{
				find: '@rooted/elements',
				replacement: fileURLToPath(new URL('packages/elements/src/_module/elements.mts', import.meta.url)),
			},
			{
				find: '@rooted/components/elements',
				replacement: fileURLToPath(new URL('packages/components/src/_module/elements.mts', import.meta.url)),
			},
			{
				find: '@rooted/components',
				replacement: fileURLToPath(new URL('packages/components/src/_module/components.mts', import.meta.url)),
			},
			{
				find: '@rooted/router/routes',
				replacement: fileURLToPath(new URL('packages/router/src/_module/routes.mts', import.meta.url)),
			},
			{
				find: '@rooted/router',
				replacement: fileURLToPath(new URL('packages/router/src/_module/router.mts', import.meta.url)),
			},
		],
	},
	test: {
		globals: true,
		include: ['packages/*/tests/**/*.test.ts', 'packages/*/tests/**/*.spec.ts'],
		environment: 'happy-dom',
		environmentMatchGlobs: [
			['packages/router/tests/**', 'happy-dom'],
		],
		coverage: {
			provider: 'v8',
			include: ['packages/*/src/**/*.{ts,mts}'],
			exclude: ['**/*.d.ts', '**/index.ts'],
		},
	},
})
