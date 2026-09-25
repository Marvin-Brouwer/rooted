// @vitest-environment node
// Runs in plain Node on purpose: the renderer installs its own happy-dom
// and restores the globals afterwards, which only means anything where there were none.
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, test } from 'vitest'

import { renderer } from '../src/_module/prerender.mts'

import type { RendererOptions } from '../src/_module/prerender.mts'

// Read before any test runs, so a renderer that broke it in an earlier test can't hide that here
const nodeNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

let outputDirectory: string | undefined

/** A built app, reduced to the two files the renderer looks for. */
async function buildOutput(bundle: string): Promise<RendererOptions> {
	outputDirectory = await mkdtemp(path.join(tmpdir(), 'rooted-prerender-'))
	await writeFile(path.join(outputDirectory, 'index.html'), '<script type="module" src="/bundle.mjs"></script>')
	await writeFile(path.join(outputDirectory, 'bundle.mjs'), bundle)
	return { outputDirectory, base: '/', logger: { warn() {} } }
}

afterEach(async () => {
	if (outputDirectory) await rm(outputDirectory, { recursive: true, force: true })
	outputDirectory = undefined
})

describe('renderer()', () => {
	test('the bundle can tell it is being pre-rendered, at module scope', async () => {
		// Arrange: how @rooted/util recognises the pre-render, checked the moment the bundle evaluates
		const options = await buildOutput(
			"globalThis.__seen_by_bundle = { happyDom: 'happyDOM' in window, nonsense: '__nope' in window }\n",
		)

		// Act
		await renderer(options, () => Promise.resolve())

		// Assert
		expect((globalThis as Record<string, unknown>)['__seen_by_bundle']).toEqual({ happyDom: true, nonsense: false })
	})

	test('renders what the app put in the body', async () => {
		// Arrange
		const options = await buildOutput("document.querySelector('#app').textContent = 'booted'\n")

		// Act
		const body = await renderer(options, render => render('/'))

		// Assert
		expect(body).toBe('<div id="app">booted</div>')
	})

	test('leaves no window behind once done', async () => {
		// Arrange
		const options = await buildOutput('export const loaded = true\n')

		// Act
		await renderer(options, () => Promise.resolve())

		// Assert
		expect(typeof window).toBe('undefined')
	})

	test('leaves no window behind when the callback throws', async () => {
		// Arrange
		const options = await buildOutput('export const loaded = true\n')

		// Act
		const failing = renderer(options, () => Promise.reject(new Error('write failed')))

		// Assert
		await expect(failing).rejects.toThrow('write failed')
		expect(typeof window).toBe('undefined')
	})

	test('skips the callback and restores the globals when the bundle fails to load', async () => {
		// Arrange
		const options = await buildOutput('throw new Error("boom")\n')
		let called = false

		// Act
		const result = await renderer(options, () => {
			called = true
			return Promise.resolve('rendered')
		})

		// Assert
		expect({ result, called }).toEqual({ result: undefined, called: false })
		expect(typeof window).toBe('undefined')
	})

	test('restores navigator as the accessor Node defines', async () => {
		// Arrange
		const options = await buildOutput('export const loaded = true\n')

		// Act
		await renderer(options, () => Promise.resolve())

		// Assert
		const after = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
		expect(after?.get).toBe(nodeNavigator?.get)
		expect(after?.value).toBe(nodeNavigator?.value)
	})
})
