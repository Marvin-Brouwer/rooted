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

const defaultBody = '<div id="app"></div>'

/** A built app, reduced to a page shell and the bundle its module script points at. */
async function buildOutput(bundle: string, body = defaultBody, head = ''): Promise<RendererOptions> {
	outputDirectory = await mkdtemp(path.join(tmpdir(), 'rooted-prerender-'))
	await writeFile(path.join(outputDirectory, 'bundle.mjs'), bundle)
	const html = `<!DOCTYPE html><html><head><script type="module" src="/bundle.mjs"></script>${head}</head><body>${body}</body></html>`
	return { html, outputDirectory, base: '/', logger: { warn() {} } }
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

	test('renders the whole document, doctype included', async () => {
		// Arrange
		const options = await buildOutput("document.querySelector('#app').textContent = 'booted'\n")

		// Act
		const html = await renderer(options, render => render('/'))

		// Assert
		expect(html).toBe('<!DOCTYPE html>\n<html><head><script type="module" src="/bundle.mjs"></script></head><body><div id="app">booted</div></body></html>')
	})

	test('keeps what the app added to head, like a component stylesheet', async () => {
		// Arrange
		const options = await buildOutput(
			"document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '/assets/card.css' }))\n",
		)

		// Act
		const html = await renderer(options, render => render('/'))

		// Assert
		expect(html).toContain('<link rel="stylesheet" href="/assets/card.css"></head>')
	})

	test('boots in the real shell, so a custom mount point is there', async () => {
		// Arrange
		const options = await buildOutput(
			"document.querySelector('main#root.shell').textContent = 'mounted'\n",
			'<main id="root" class="shell"></main>',
		)

		// Act
		const html = await renderer(options, render => render('/'))

		// Assert
		expect(html).toContain('<main id="root" class="shell">mounted</main>')
	})

	test('doesn\'t run scripts from the shell, only the bundle', async () => {
		// Arrange
		const options = await buildOutput(
			'export const loaded = true\n',
			defaultBody,
			'<script>globalThis.__shell_script_ran = true</script>',
		)

		// Act
		await renderer(options, () => Promise.resolve())

		// Assert
		expect((globalThis as Record<string, unknown>)['__shell_script_ran']).toBeUndefined()
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
