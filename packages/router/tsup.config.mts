import { defineConfig } from 'tsup'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * TSUP has a bug where having more than one entry causes more than one source map url
 * This removes that when the bundling is done.
 */
async function deduplicateSourceMaps() {
	const files = (await readdir('dist')).filter(f => f.endsWith('.mjs'))
	await Promise.all(files.map(async file => {
		const filePath = join('dist', file)
		const content = await readFile(filePath, 'utf8')
		const fixed = content.replace(
			/(\/\/# sourceMappingURL=[^\n]*\n)(\/\/# sourceMappingURL=[^\n]*)/g,
			'$2'
		)
		if (fixed !== content) await writeFile(filePath, fixed, 'utf8')
	}))
}

export default defineConfig([
	{
		entry: ['src/_module/*.mts', '!src/_module/manifest.mts'],
		format: ['esm'],
		platform: 'browser',
		treeshake: { moduleSideEffects: 'no-external' },
		dts: true,
		clean: true,
		sourcemap: 'inline',
		onSuccess: deduplicateSourceMaps,
	},
	{
		entry: ['src/_module/manifest.mts'],
		format: ['esm'],
		platform: 'node',
		tsconfig: 'tsconfig.plugin.json',
		dts: true,
		sourcemap: 'inline',
		onSuccess: deduplicateSourceMaps,
	},
])
