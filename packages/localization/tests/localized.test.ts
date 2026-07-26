import { describe, test, expect, vi, afterEach } from 'vitest'

import { createComponent } from '@rooted/components/elements'

import { dictionary, translation, type DictionaryModule } from '../src/dictionary.mts'
import { configureLocalization } from '../src/localization.mts'

function navigate(path: string) {
	history.pushState(undefined, '', path)
	globalThis.dispatchEvent(new PopStateEvent('popstate', { state: undefined }))
}

/** Appends to the document and lets the async `onMount` settle. */
async function mount(node: Node) {
	document.body.append(node)
	await flush()
	return node
}

/** Two macrotask turns: enough for `await load()` plus the render that follows. */
async function flush() {
	await new Promise(resolve => setTimeout(resolve))
	await new Promise(resolve => setTimeout(resolve))
}

function loader(module: DictionaryModule) {
	return vi.fn(() => Promise.resolve(module))
}

const nlNL = {
	default: dictionary(
		translation('this is an example label', 'dit is een voorbeeld label'),
	),
}

function configure() {
	return configureLocalization({
		default: 'en-GB',
		dictionaries: { 'nl-NL': loader(nlNL) },
	})
}

afterEach(() => {
	vi.restoreAllMocks()
	document.body.replaceChildren()
	history.pushState(undefined, '', '/')
})

describe('localized()', () => {
	test('renders on mount with the current locale', async () => {
		const localization = configure()
		navigate('/nl-NL/greeting/')

		const render = vi.fn((locale: string) => document.createTextNode(`content for ${locale}`))
		await mount(localization.localized(render))

		expect(render).toHaveBeenCalledOnce()
		expect(render).toHaveBeenCalledWith('nl-NL')
		expect(document.body.textContent).toContain('content for nl-NL')
	})

	test('the dictionary is loaded before render runs', async () => {
		const localization = configure()
		navigate('/nl-NL/greeting/')

		// Rendering the translation is the whole point: without the awaited load
		// this would come back with the `[i18n missing]` dev marker
		const render = vi.fn(() => document.createTextNode(localization.text`this is an example label`))
		await mount(localization.localized(render))

		expect(document.body.textContent).toBe('dit is een voorbeeld label')
	})

	test('re-renders with the new locale when the locale changes', async () => {
		const localization = configure()
		const render = vi.fn((locale: string) => document.createTextNode(`content for ${locale}`))
		await mount(localization.localized(render))
		expect(document.body.textContent).toContain('content for en-GB')

		navigate('/nl-NL/greeting/')
		await flush()

		expect(render).toHaveBeenCalledTimes(2)
		expect(render).toHaveBeenLastCalledWith('nl-NL')
		expect(document.body.textContent).toContain('content for nl-NL')
	})

	test('replaces the previous content rather than appending to it', async () => {
		const localization = configure()
		await mount(localization.localized((locale: string) => document.createTextNode(`content for ${locale}`)))

		navigate('/nl-NL/greeting/')
		await flush()

		expect(document.body.textContent).not.toContain('content for en-GB')
	})

	test('does not re-render when navigating within the same locale', async () => {
		const localization = configure()
		navigate('/nl-NL/a/')

		const render = vi.fn((locale: string) => document.createTextNode(`content for ${locale}`))
		await mount(localization.localized(render))
		expect(render).toHaveBeenCalledOnce()

		navigate('/nl-NL/b/')
		await flush()

		expect(render).toHaveBeenCalledOnce()
	})

	test('accepts an async render', async () => {
		const localization = configure()
		const render = vi.fn(async (locale: string) => {
			await Promise.resolve()
			return document.createTextNode(`async ${locale}`)
		})
		await mount(localization.localized(render))

		expect(document.body.textContent).toContain('async en-GB')
	})

	test('renders a component instance', async () => {
		const localization = configure()
		const { component } = await import('@rooted/components')
		const Inner = component({
			name: 'localized-test-inner',
			onMount({ append, element }) {
				append(element('span', { textContent: 'inner' }))
			},
		})

		await mount(localization.localized(() => createComponent(Inner)))
		await flush()

		expect(document.body.textContent).toContain('inner')
	})

	test('stops re-rendering once unmounted', async () => {
		const localization = configure()
		const render = vi.fn((locale: string) => document.createTextNode(`content for ${locale}`))
		const instance = await mount(localization.localized(render))
		expect(render).toHaveBeenCalledOnce()

		instance.parentNode?.removeChild(instance)
		// disconnectedCallback defers through queueMicrotask so re-parenting
		// doesn't count as an unmount; let that settle before navigating
		await flush()

		navigate('/nl-NL/greeting/')
		await flush()

		expect(render).toHaveBeenCalledOnce()
	})
})
