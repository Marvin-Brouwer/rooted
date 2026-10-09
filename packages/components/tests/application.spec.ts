/**
 * Spec: booting a pre-rendered page
 *
 * The build runs `application()` in happy-dom and writes the page as it looks afterwards.
 * The browser then loads that page and runs `application()` again. These tests play both halves in one document,
 * reading the environment as the pre-renderer first and as the client second.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { application } from '../src/application.mts'
import { component } from '../src/component.mts'
import { GenericComponent } from '../src/component/generic-component.mts'

const App = component({
	name: 'pre-rendered-app',
	onMount({ append, element }) {
		append(element('button', { id: 'counter', textContent: '0' }))
	},
})

// Component hosts mount in a microtask
function settle() {
	return new Promise(resolve => setTimeout(resolve))
}

// The pre-render's half: boot the app in happy-dom and serialize the result
async function preRenderPage(shell = '<div id="app"></div>', options?: Parameters<typeof application>[1]) {
	document.body.innerHTML = shell
	application(App, options)
	await settle()
	return document.body.innerHTML
}

// The environment checks for happy-dom, so a window without it reads as a browser
function runAsClient() {
	vi.stubGlobal('window', { addEventListener() {} })
}

// Lets a host's connectedCallback run its mount straight away, so a throw reaches the test
function mountSynchronously() {
	vi.stubGlobal('queueMicrotask', (callback: () => void) => callback())
}

beforeEach(() => {
	document.body.replaceChildren()
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('application, while pre-rendering', () => {
	test('mounts inside the root, so the written page still has it', async () => {
		// Arrange
		document.body.innerHTML = '<div id="app"></div>'

		// Act
		const app = application(App)
		await settle()

		// Assert
		const root = document.querySelector('#app')
		expect(app.parentElement).toBe(root)
		expect(root?.querySelector('#counter')).not.toBeNull()
	})

	test('marks the root as pre-rendered', async () => {
		// Act
		const page = await preRenderPage()

		// Assert
		expect(page).toContain('<div id="app" data-rooted-prerendered="">')
	})
})

describe('application, in the browser, on a pre-rendered page', () => {
	test('replaces the pre-rendered markup with one freshly mounted app', async () => {
		// Arrange
		document.body.innerHTML = await preRenderPage()
		const preRenderedButton = document.querySelector('#counter')
		runAsClient()

		// Act
		const app = application(App)
		await settle()

		// Assert
		const root = document.querySelector('#app')
		expect(root?.children).toHaveLength(1)
		expect(root?.firstElementChild).toBe(app)
		expect(document.querySelectorAll(GenericComponent.tagName)).toHaveLength(1)
		expect(document.querySelectorAll('#counter')).toHaveLength(1)
		expect(preRenderedButton?.isConnected).toBe(false)
	})

	test('takes the pre-rendered mark off the root', async () => {
		// Arrange
		document.body.innerHTML = await preRenderPage()
		runAsClient()

		// Act
		application(App)

		// Assert
		expect(document.querySelector('#app')?.hasAttribute('data-rooted-prerendered')).toBe(false)
	})

	test('finds the root through a custom selector too', async () => {
		// Arrange
		document.body.innerHTML = await preRenderPage('<main class="shell"></main>', { selector: 'main.shell' })
		runAsClient()

		// Act
		const app = application(App, { selector: 'main.shell' })
		await settle()

		// Assert
		expect(document.querySelector('main.shell')?.firstElementChild).toBe(app)
		expect(document.querySelectorAll(GenericComponent.tagName)).toHaveLength(1)
	})

	test('leaves the pre-rendered markup in place when the app boots late', async () => {
		// Arrange: the hosts the page was written with mount before application() runs, like after a top-level await
		document.body.innerHTML = await preRenderPage()
		runAsClient()

		// Act
		await settle()

		// Assert
		expect(document.querySelector('#counter')?.textContent).toBe('0')
	})
})

describe('a host without component data', () => {
	test('mounts quietly inside a pre-rendered root', async () => {
		// Arrange
		document.body.innerHTML = await preRenderPage()
		const leftover = document.querySelector<GenericComponent>(GenericComponent.tagName)
		mountSynchronously()

		// Act
		const mount = () => leftover?.connectedCallback()

		// Assert
		expect(mount).not.toThrow()
	})

	test('still throws outside a pre-rendered root', () => {
		// Arrange: connected, with the mount that connecting queues held back
		const host = document.createElement(GenericComponent.tagName) as GenericComponent
		vi.stubGlobal('queueMicrotask', () => {})
		document.body.append(host)
		mountSynchronously()

		// Act
		const mount = () => host.connectedCallback()

		// Assert
		expect(mount).toThrow('mounted without component data')
	})
})
