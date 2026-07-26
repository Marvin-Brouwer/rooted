import { describe, test, expect, afterEach } from 'vitest'

import { createComponent } from '@rooted/components/elements'

import { Markdown } from '../src/markdown.mts'

async function mount(options: Parameters<typeof createComponent<never>>[1] extends never ? never : object) {
	const instance = createComponent(Markdown, options as never)
	document.body.append(instance)
	await new Promise(resolve => setTimeout(resolve))
	return instance
}

afterEach(() => {
	document.body.replaceChildren()
})

describe('Markdown', () => {
	test('renders the html from a transformed module shape', async () => {
		await mount({ source: { html: '<h1>Hello</h1><p>Body</p>' } })

		expect(document.body.querySelector('h1')?.textContent).toBe('Hello')
		expect(document.body.querySelector('p')?.textContent).toBe('Body')
	})

	test('renders a bare html string', async () => {
		await mount({ source: '<p>Just a string</p>' })
		expect(document.body.querySelector('p')?.textContent).toBe('Just a string')
	})

	test('accepts a module namespace object directly', async () => {
		// What `await import('./about.md')` hands back, and what branch() returns
		const module = { frontmatter: { title: 'About' }, html: '<h2>About</h2>' }
		await mount({ source: module })

		expect(document.body.querySelector('h2')?.textContent).toBe('About')
	})

	test('wraps in a div by default', async () => {
		await mount({ source: '<p>x</p>' })
		expect(document.body.querySelector('div')).not.toBeNull()
	})

	test('honours the tag option', async () => {
		await mount({ source: '<p>x</p>', tag: 'article' })

		const article = document.body.querySelector('article')
		expect(article).not.toBeNull()
		expect(article?.querySelector('p')?.textContent).toBe('x')
	})

	test('applies classes', async () => {
		await mount({ source: '<p>x</p>', classes: ['prose', 'wide'] })
		expect(document.body.querySelector('.prose.wide')).not.toBeNull()
	})

	test('renders nested markup rather than escaping it', async () => {
		await mount({ source: '<ul><li>one</li><li>two</li></ul>' })
		expect(document.body.querySelectorAll('li')).toHaveLength(2)
	})

	test('empty html renders an empty wrapper rather than throwing', async () => {
		await mount({ source: '' })
		expect(document.body.querySelector('div')?.childNodes).toHaveLength(0)
	})
})
