import { describe, expect, test, vi } from 'vitest'

import { ComponentContext } from '@rooted/components'

import { createElementFactory } from '../../elements/src/element-factory.mts'
import { ApplyUpdateButton, ApplyUpdateButtonOptions } from '../src/apply-update-button.mts'
import { UpdateNotification, UpdateNotificationOptions } from '../src/update-notification.mts'

import { createRegistration, createWorker, install, stubServiceWorker } from './service-worker-stub.ts'

/**
 * Mounts a component without registering a custom element, the way
 * `packages/router/tests/navigation-link.test.ts` does. Only the context members
 * these two reach for are filled in.
 */
function mount<TOptions extends object>(
	constructor: { onMount: (context: ComponentContext<TOptions>) => void },
	options: TOptions,
) {
	const unmounting = new AbortController()
	const appended: Node[] = []

	constructor.onMount({
		options,
		signal: unmounting.signal,
		element: createElementFactory(tag => document.createElement(tag), unmounting.signal),
		// The real `append` turns a string into a text node, so this one does too.
		append(...nodes: (Node | string)[]) {
			appended.push(...nodes.map(node => typeof node === 'string' ? document.createTextNode(node) : node))
			return nodes
		},
	} as unknown as ComponentContext<TOptions>)

	return { appended, unmounting }
}

/** Both components look the registration up asynchronously, so let that settle. */
function settle() {
	return new Promise(resolve => setTimeout(resolve, 0))
}

function mountNotification(options: UpdateNotificationOptions) {
	return mount(UpdateNotification, options)
}

function mountButton(options: ApplyUpdateButtonOptions) {
	const { appended } = mount(ApplyUpdateButton, options)
	const [button] = appended as HTMLButtonElement[]

	return button
}

describe('UpdateNotification', () => {
	test('renders nothing while there is no update, so it is safe to leave in a layout', async () => {
		// Arrange
		stubServiceWorker()
		const banner = document.createElement('div')

		// Act
		const { appended } = mountNotification({ children: banner })
		await settle()

		// Assert
		expect(appended).toHaveLength(0)
	})

	test('renders its children once a version is waiting', async () => {
		// Arrange
		stubServiceWorker({ registration: createRegistration(createWorker('installed')) })
		const banner = document.createElement('div')

		// Act
		const { appended } = mountNotification({ children: banner })
		await settle()

		// Assert
		expect(appended).toEqual([banner])
	})

	test('renders a mixed array in order, skipping the empty entries', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		const button = document.createElement('button')
		const { appended } = mountNotification({ children: ['A new version is ready.', undefined, button, null] })
		await settle()

		// Act
		install(registration, createWorker())

		// Assert
		expect(appended).toHaveLength(2)
		expect(appended[0].textContent).toBe('A new version is ready.')
		expect(appended[1]).toBe(button)
	})
})

describe('ApplyUpdateButton', () => {
	test('starts disabled, because there is nothing to apply yet', async () => {
		// Arrange
		stubServiceWorker()

		// Act
		const button = mountButton({ label: 'Reload' })
		await settle()

		// Assert
		expect(button.disabled).toBe(true)
		expect(button.textContent).toBe('Reload')
	})

	test('enables once a version is waiting', async () => {
		// Arrange
		const { registration } = stubServiceWorker()
		const button = mountButton({ label: 'Reload' })
		await settle()

		// Act
		install(registration, createWorker())

		// Assert
		expect(button.disabled).toBe(false)
	})

	test('hands over and disables itself when clicked', async () => {
		// Arrange
		vi.spyOn(location, 'reload').mockImplementation(() => {})
		const waiting = createWorker('installed')
		stubServiceWorker({ registration: createRegistration(waiting) })
		const button = mountButton({ label: 'Reload' })
		await settle()

		// Act
		button.click()
		await settle()

		// Assert
		expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
		expect(button.disabled).toBe(true)
		vi.restoreAllMocks()
	})
})
