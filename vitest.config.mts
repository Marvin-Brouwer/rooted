import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: {
		alias: [
			// More specific aliases first
			{
				find: '@rooted/util/dev',
				replacement: fileURLToPath(new URL('./packages/util/src/_module/dev.mts', import.meta.url)),
			},
			{
				find: '@rooted/util',
				replacement: fileURLToPath(new URL('./packages/util/src/_module/util.mts', import.meta.url)),
			},
			{
				find: '@rooted/components/elements',
				replacement: fileURLToPath(new URL('./packages/components/src/_module/elements.mts', import.meta.url)),
			},
			{
				find: '@rooted/components',
				replacement: fileURLToPath(new URL('./packages/components/src/_module/components.mts', import.meta.url)),
			},
		],
	},
	test: {
		globals: true,
		include: ['packages/*/tests/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['packages/*/src/**/*.{ts,mts}'],
			exclude: ['**/*.d.ts', '**/index.ts'],
		},
	},
})
