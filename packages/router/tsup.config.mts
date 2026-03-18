import fs from 'node:fs/promises'

import { dedupeSourcemapsPlugin } from '@rooted/tsup'
import { defineConfig } from 'tsup'

if (!process.argv.includes('--watch')) {
	// clear:true removes .d.ts with multiple entries
	await fs.rm('./dist', { recursive: true, force: true })
}

export default defineConfig([
	{
		entry: ['src/_module/*.mts', '!src/_module/manifest.mts'],
		format: ['esm'],
		platform: 'browser',
		treeshake: { moduleSideEffects: 'no-external' },
		dts: true,
		sourcemap: 'inline',
		plugins: [dedupeSourcemapsPlugin()],
	},
	{
		entry: ['src/_module/manifest.mts'],
		format: ['esm'],
		platform: 'node',
		treeshake: { moduleSideEffects: 'no-external' },
		tsconfig: 'tsconfig.plugin.json',
		dts: true,
		sourcemap: 'inline',
		plugins: [dedupeSourcemapsPlugin()],
	},
])
