import { describe, test, expect } from 'vitest'

import { rootedMarkdown, type MarkdownPluginOptions } from '../plugins/markdown.mts'

import type { Plugin, ResolvedConfig } from 'vite'

type TransformHook = (this: unknown, code: string, id: string) => Promise<{ code: string } | undefined>

/** Drives the plugin's hooks the way Vite would, without booting Vite. */
function transformer(command: ResolvedConfig['command'] = 'serve', options?: MarkdownPluginOptions) {
	const plugin = rootedMarkdown(options) as Plugin & { transform: TransformHook }
	const configResolved = plugin.configResolved as (config: ResolvedConfig) => void
	configResolved.call(plugin, { command } as ResolvedConfig)
	return (code: string, id: string) => plugin.transform.call(plugin, code, id)
}

/** Evaluates the emitted module so tests assert on real exports, not on source text. */
async function evaluate(code: string) {
	const module = await import(`data:text/javascript,${encodeURIComponent(code)}`) as {
		frontmatter: Record<string, unknown>
		html: string
		default: { frontmatter: Record<string, unknown>, html: string }
	}
	return module
}

const source = `---
title: About us
tags: [one, two]
---

# Hello

Some *emphasis* and a [link](https://example.com).
`

describe('rootedMarkdown()', () => {
	test('is named so it shows up in vite plugin output', () => {
		expect(rootedMarkdown().name).toBe('vite-plugin:rooted-markdown')
	})

	test('extracts frontmatter and renders the body', async () => {
		const result = await transformer()(source, '/src/about.md')
		expect(result).toBeDefined()

		const module = await evaluate(result!.code)
		expect(module.frontmatter).toEqual({ title: 'About us', tags: ['one', 'two'] })
		expect(module.html).toContain('<h1>Hello</h1>')
		expect(module.html).toContain('<em>emphasis</em>')
		expect(module.html).toContain('href="https://example.com"')
	})

	test('the frontmatter block itself is not rendered into the html', async () => {
		const result = await transformer()(source, '/src/about.md')
		const module = await evaluate(result!.code)
		expect(module.html).not.toContain('About us')
	})

	test('exports html by name so a module namespace is a valid Markdown source', async () => {
		const result = await transformer()(source, '/src/about.md')
		const module = await evaluate(result!.code)

		// This is what `create(Markdown, { source: await import('./about.md') })` relies on
		expect(typeof module.html).toBe('string')
		expect(module.default).toEqual({ frontmatter: module.frontmatter, html: module.html })
	})

	test('handles a file with no frontmatter', async () => {
		const result = await transformer()('# Just a heading\n', '/src/plain.md')
		const module = await evaluate(result!.code)
		expect(module.frontmatter).toEqual({})
		expect(module.html).toContain('<h1>Just a heading</h1>')
	})

	test('ignores files that are not markdown', async () => {
		expect(await transformer()('body {}', '/src/styles.css')).toBeUndefined()
	})

	test('leaves query-suffixed imports for vite to handle', async () => {
		const transform = transformer()
		expect(await transform(source, '/src/about.md?raw')).toBeUndefined()
		expect(await transform(source, '/src/about.md?url')).toBeUndefined()
	})

	test('does not minify when serving', async () => {
		const result = await transformer('serve')(source, '/src/about.md')
		const module = await evaluate(result!.code)
		expect(module.html).toContain('\n')
	})

	test('minifies when building', async () => {
		const result = await transformer('build')(source, '/src/about.md')
		const module = await evaluate(result!.code)
		expect(module.html).not.toContain('\n')
		expect(module.html).toContain('<h1>Hello</h1>')
	})

	test('the minify option overrides the command', async () => {
		const served = await transformer('serve', { minify: true })(source, '/src/about.md')
		expect((await evaluate(served!.code)).html).not.toContain('\n')

		const built = await transformer('build', { minify: false })(source, '/src/about.md')
		expect((await evaluate(built!.code)).html).toContain('\n')
	})

	test('escapes content that would otherwise break the emitted module', async () => {
		const tricky = '---\ntitle: "quote \\" and `tick`"\n---\n\nA line with `code` and "quotes".\n'
		const result = await transformer()(tricky, '/src/tricky.md')
		const module = await evaluate(result!.code)
		expect(module.frontmatter['title']).toBe('quote " and `tick`')
		expect(module.html).toContain('<code>code</code>')
	})
})
