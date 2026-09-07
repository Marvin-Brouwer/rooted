import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'

import type { ResolvedConfig } from 'vite'

/** The extensions a middleware file may be written in. */
const MIDDLEWARE_EXTENSIONS = /\.(mts|ts|mjs|js)$/

/**
 * Transpiles the adapter's `middlewarePath` folder into `<outDir>/middleware`,
 * one `.mjs` per source file, keeping the names so the generated server's
 * lexicographic load order still means what the author wrote.
 *
 * Only bare imports are left external, so a middleware file's relative imports
 * are bundled in and it runs from the output directory with nothing else there.
 */
export async function buildMiddlewareFiles(options: {
	/** Adapter plugin name, for the error message. */
	name: string
	/** The `middlewarePath` option, relative to the Vite project root. */
	middlewarePath: string
	/** Where the build is writing. */
	outputDirectory: string
	config: ResolvedConfig
}): Promise<void> {
	const sourceDirectory = path.resolve(options.config.root, options.middlewarePath)
	const files = (await readdir(sourceDirectory)).filter(file => MIDDLEWARE_EXTENSIONS.test(file))
	if (files.length === 0) {
		throw new Error(
			`[${options.name}] No middleware files (.mts, .ts, .mjs, .js) found in middlewarePath "${options.middlewarePath}"`,
		)
	}

	const middlewareDirectory = path.join(options.outputDirectory, 'middleware')
	await mkdir(middlewareDirectory, { recursive: true })

	// Imported here so vite dev never pays for loading rolldown.
	const { build } = await import('rolldown')
	for (const file of files) {
		await build({
			input: path.join(sourceDirectory, file),
			platform: 'node',
			external: id => !id.startsWith('.') && !path.isAbsolute(id),
			logLevel: 'silent',
			output: {
				file: path.join(middlewareDirectory, file.replace(MIDDLEWARE_EXTENSIONS, '.mjs')),
				format: 'esm',
			},
		})
	}
}
