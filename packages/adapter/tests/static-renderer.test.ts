// @vitest-environment node
// Runs in plain Node on purpose: the static renderer installs its own happy-dom
// and restores the globals afterwards, which only means anything where there were none.
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, test } from 'vitest'

import { createStaticRenderer } from '../src/static-renderer.mts'

import type { ResolvedConfig } from 'vite'

// createStaticRenderer only reads `base` and `logger`
const config = { base: '/', logger: { warn() {} } } as unknown as ResolvedConfig

let outputDirectory: string | undefined

/** A built app, reduced to the two files the renderer looks for. */
async function buildOutput(bundle: string): Promise<string> {
	outputDirectory = await mkdtemp(path.join(tmpdir(), 'rooted-static-renderer-'))
	await writeFile(path.join(outputDirectory, 'index.html'), '<script type="module" src="/bundle.mjs"></script>')
	await writeFile(path.join(outputDirectory, 'bundle.mjs'), bundle)
	return outputDirectory
}

afterEach(async () => {
	if (outputDirectory) await rm(outputDirectory, { recursive: true, force: true })
	outputDirectory = undefined
})

describe('createStaticRenderer()', () => {
	test('marks the environment as the pre-render before the bundle is imported', async () => {
		// Arrange: the bundle reads the mark at module scope, the way @rooted/util does
		const directory = await buildOutput(
			'globalThis.__seen_by_bundle = globalThis.__rooted_environment\n',
		)

		// Act
		const renderer = await createStaticRenderer(config, directory)

		// Assert
		expect((globalThis as Record<string, unknown>)['__seen_by_bundle']).toBe('preRenderer')
		await renderer?.dispose()
	})

	test('clears the mark on dispose', async () => {
		// Arrange
		const directory = await buildOutput('export const loaded = true\n')
		const renderer = await createStaticRenderer(config, directory)

		// Act
		await renderer?.dispose()

		// Assert
		expect(Object.hasOwn(globalThis, '__rooted_environment')).toBe(false)
	})

	test('clears the mark when the bundle fails to load', async () => {
		// Arrange
		const directory = await buildOutput('throw new Error("boom")\n')

		// Act
		const renderer = await createStaticRenderer(config, directory)

		// Assert
		expect(renderer).toBeUndefined()
		expect(Object.hasOwn(globalThis, '__rooted_environment')).toBe(false)
	})
})
