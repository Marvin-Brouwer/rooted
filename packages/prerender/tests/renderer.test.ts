// @vitest-environment node
// Runs in plain Node on purpose: the renderer is supposed to leave this thread's globals alone,
// which only means anything where there's no DOM to begin with.
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, test, vi } from 'vitest'

import { renderer } from '../src/_module/prerender.mts'

import type { RendererOptions } from '../src/_module/prerender.mts'

let outputDirectory: string | undefined

const defaultBody = '<div id="app"></div>'

/** A built app, reduced to a page shell and the bundle its module script points at. */
async function buildOutput(bundle: string, body = defaultBody, head = ''): Promise<RendererOptions> {
	outputDirectory = await mkdtemp(path.join(tmpdir(), 'rooted-prerender-'))
	await writeFile(path.join(outputDirectory, 'bundle.mjs'), bundle)
	const html = `<!DOCTYPE html><html><head><script type="module" src="/bundle.mjs"></script>${head}</head><body>${body}</body></html>`
	return { html, outputDirectory, base: '/', logger: { warn: vi.fn() } }
}

afterEach(async () => {
	if (outputDirectory) await rm(outputDirectory, { recursive: true, force: true })
	outputDirectory = undefined
})

describe('renderer()', () => {
	test('the bundle can tell it is being pre-rendered, at module scope', async () => {
		// Arrange: how @rooted/util recognises the pre-render, checked the moment the bundle evaluates
		const options = await buildOutput(
			"document.querySelector('#app').textContent = JSON.stringify({ happyDom: 'happyDOM' in window, nonsense: '__nope' in window })\n",
		)

		// Act
		const html = await renderer(options, render => render('/'))

		// Assert
		expect(html).toContain('{"happyDom":true,"nonsense":false}')
	})

	test('renders the whole document, doctype included', async () => {
		// Arrange
		const options = await buildOutput("document.querySelector('#app').textContent = 'booted'\n")

		// Act
		const html = await renderer(options, render => render('/'))

		// Assert
		expect(html).toBe('<!DOCTYPE html>\n<html><head><script type="module" src="/bundle.mjs"></script></head><body><div id="app">booted</div></body></html>')
	})

	test('boots the app on the page\'s own URL', async () => {
		// Arrange
		const options = await buildOutput("document.querySelector('#app').textContent = location.pathname\n")

		// Act
		const html = await renderer(options, render => render('/recipes/pasta/'))

		// Assert
		expect(html).toContain('<div id="app">/recipes/pasta/</div>')
	})

	test('starts every page from scratch, nothing carries over', async () => {
		// Arrange: module state and <head> both survive when one app renders every page
		const options = await buildOutput(
			'globalThis.boots = (globalThis.boots ?? 0) + 1\n'
			+ "document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: location.pathname + 'page.css' }))\n"
			+ "document.querySelector('#app').textContent = 'boot ' + globalThis.boots\n",
		)

		// Act
		const pages = await renderer(options, render => Promise.all([render('/first/'), render('/second/')]))

		// Assert
		expect(pages?.[1]).toContain('<div id="app">boot 1</div>')
		expect(pages?.[1]).toContain('href="/second/page.css"')
		expect(pages?.[1]).not.toContain('/first/page.css')
	})

	test('waits for content the app renders after a lazy import', async () => {
		// Arrange: route components load lazily, so the page isn't done when the bundle finishes evaluating
		const options = await buildOutput(
			"setTimeout(() => setTimeout(() => { document.querySelector('#app').textContent = 'lazy' }, 20), 0)\n",
		)

		// Act
		const html = await renderer(options, render => render('/'))

		// Assert
		expect(html).toContain('<div id="app">lazy</div>')
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
			"document.querySelector('#app').textContent = String(globalThis.shellScriptRan)\n",
			defaultBody,
			'<script>globalThis.shellScriptRan = true</script>',
		)

		// Act
		const html = await renderer(options, render => render('/'))

		// Assert
		expect(html).toContain('<div id="app">undefined</div>')
	})

	test('never installs a DOM on this thread', async () => {
		// Arrange
		const options = await buildOutput('export const loaded = true\n')

		// Act
		const seenWhileRendering = await renderer(options, async (render) => {
			const rendering = render('/')
			const seen = typeof window
			await rendering
			return seen
		})

		// Assert
		expect(seenWhileRendering).toBe('undefined')
		expect(typeof window).toBe('undefined')
		expect(Object.getOwnPropertyDescriptor(globalThis, 'navigator')?.get).toBeTypeOf('function')
	})

	test('warns and returns undefined for a page whose bundle throws', async () => {
		// Arrange
		const options = await buildOutput('throw new Error("boom")\n')

		// Act
		const html = await renderer(options, render => render('/broken/'))

		// Assert
		expect(html).toBeUndefined()
		expect(options.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Rendering /broken/ failed: Error: boom'))
	})

	test('skips the callback when the shell has no module script', async () => {
		// Arrange
		const options = { ...await buildOutput(''), html: '<html><head></head><body></body></html>' }
		const use = vi.fn(() => Promise.resolve('rendered'))

		// Act
		const result = await renderer(options, use)

		// Assert
		expect(result).toBeUndefined()
		expect(use).not.toHaveBeenCalled()
	})
})
