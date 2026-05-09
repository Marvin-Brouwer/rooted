import { createElementFactory, ElementCreator } from '@rooted/elements'
import { createEventBuilder } from '@rooted/elements/events'
import { isDevelopment } from '@rooted/util/dev'

import { create } from '../component-factory.mts'
import { ComponentConstructor, ComponentContext } from '../component.mts'
import { devHelper } from '../dev-helper.mts'
import { pageSignal } from '../page-context.mts'
import { RootedElement } from '../rooted-element.mts'

import { applyContentStyleFallback, applyScope } from './styles.mts'

type ComponentData<T> = {
	component: Readonly<ComponentConstructor>
	options: T
}

function createComponentStore() {
	const store = new WeakMap<GenericComponent, ComponentData<unknown>>()

	function set(element: GenericComponent, component: ComponentConstructor, options: unknown) {
		store.set(element, { component, options })
		devHelper.appendComponentMetaData?.(element, component, options)
	}

	function get<T>(element: GenericComponent) {
		return store.get(element) as ComponentData<T>
	}

	return {
		get, set,
	}
}

/**
 * @internal
 * Weak map keyed by `GenericComponent` host elements. Holds the component
 * constructor and options. Stored off-element so user-supplied options aren't
 * reachable through DevTools in production. In dev mode the same data is also
 * mirrored on the element for debugging.
 */
export const componentStore = createComponentStore()

/**
 * The custom element that wraps every {@link Component}. Tag name is `<r-->`
 * in production and `<rooted-component>` in development.
 *
 * When you call `create(MyComponent)`, rooted creates an instance of this
 * class, stashes the component and its options in a private `WeakMap`, and on
 * `connectedCallback` runs the component's `onMount` with a typed
 * {@link ComponentContext}.
 *
 * You'll see this type in signatures (`create(MyComponent)` returns
 * `GenericComponent`), but don't instantiate or subclass it directly. Use
 * {@link component} and {@link create}.
 *
 * In dev mode the element also exposes `component`, `options`, and `definedAt`
 * as direct properties so they show up in DevTools. These are absent in
 * production.
 *
 * @see {@link component}
 * @see {@link create}
 */
export class GenericComponent extends RootedElement {
	public static tagName = isDevelopment() ? 'rooted-component' : 'r--'

	private abortController!: AbortController

	protected onMount() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data = componentStore.get<any>(this)
		if (!data) throw new Error('[rooted] GenericComponent mounted without component data. Use create() to instantiate components.')
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { component, options } = data

		if (isDevelopment()) this.setAttribute('r-component', component.name)
		this.setAttribute('role', 'none')

		applyContentStyleFallback(this)
		applyScope(this, component.styles)

		// Re-create to cover remounting
		this.abortController?.abort('remounted')
		this.abortController = new AbortController()
		pageSignal.addEventListener('abort', reason => this.abortController.abort(reason), {
			// Un register on unmount if the page is still alive
			signal: this.abortController.signal,
		})

		// eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias -- necessary for closures
		const base = this
		const ownerDocument = this.ownerDocument

		const createElement: ElementCreator = (tag: string, ns?: string) => ns
			? ownerDocument.createElementNS(ns, tag)
			: ownerDocument.createElement(tag)
		const element = createElementFactory(createElement, this.abortController.signal)

		function append<T extends Node | string | GenericComponent>(node: T): T
		function append<T extends Node | string | GenericComponent>(...node: T[]): T[]
		function append(...nodes: (Node | string | GenericComponent)[]): Node[]
		function append(...nodes: (Node | string | GenericComponent)[]): Node[] | Node {
			const realNodes = nodes.map((nodeOrString) => {
				return typeof nodeOrString === 'string'
					? document.createTextNode(nodeOrString)
					: nodeOrString
			})

			base.append(...realNodes)

			return nodes.length === 1
				? realNodes[0]
				: realNodes
		}

		function prepend<T extends Node | string | GenericComponent>(node: T): T
		function prepend<T extends Node | string | GenericComponent>(...node: T[]): T[]
		function prepend(...nodes: (Node | string | GenericComponent)[]): Node[]
		function prepend(...nodes: (Node | string | GenericComponent)[]): Node[] | Node {
			const realNodes = nodes.map((nodeOrString) => {
				return typeof nodeOrString === 'string'
					? document.createTextNode(nodeOrString)
					: nodeOrString
			})

			base.prepend(...realNodes)

			return nodes.length === 1
				? realNodes[0]
				: realNodes
		}

		function replace<T extends Node | string | GenericComponent>(node: T): T
		function replace<T extends Node | string | GenericComponent>(...node: T[]): T[]
		function replace(...nodes: (Node | string | GenericComponent)[]): Node[]
		function replace(...nodes: (Node | string | GenericComponent)[]): Node[] | Node {
			const realNodes = nodes.map((nodeOrString) => {
				return typeof nodeOrString === 'string'
					? document.createTextNode(nodeOrString)
					: nodeOrString
			})

			if ((nodes.length > 0 || base.children.length > 0))
				base.replaceChildren(...realNodes)

			return nodes.length === 1
				? realNodes[0]
				: realNodes
		}

		function remove<T extends Node | string | GenericComponent>(node: T): T
		function remove<T extends Node | string | GenericComponent>(...node: T[]): T[]
		function remove(...nodes: (Node | string | GenericComponent)[]): Node[]
		function remove(...nodes: (Node | string | GenericComponent)[]): Node[] | Node {
			const realNodes = nodes.map((nodeOrString) => {
				return typeof nodeOrString === 'string'
					? document.createTextNode(nodeOrString)
					: nodeOrString
			})

			for (const node of realNodes)
				// eslint-disable-next-line unicorn/prefer-dom-node-remove -- remove does not exist on type Node
				base.removeChild(node)

			return nodes.length === 1
				? realNodes[0]
				: realNodes
		}

		const on = createEventBuilder(
			base,
			this.abortController.signal,
		)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const context: ComponentContext<any> = {
			signal: this.abortController.signal,
			on,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			options,
			create,
			element,
			append,
			prepend,
			// eslint-disable-next-line unicorn/no-null
			insertBefore: (node, child) => base.insertBefore(node, child ?? null),
			swap: base.replaceChild.bind(base),
			replace,
			remove,
		}

		const handleError = (error: unknown) => {
			console.error(`[component] Mounting ${component.name} failed`, error)
			if (isDevelopment()) {
				append(
					element('pre', {
						role: 'alert',
						textContent: String(error),
					}),
				)
			}
		}

		try {
			Promise.resolve(component.onMount.call(context, context)).catch(handleError)
		}
		catch (error) {
			handleError(error)
		}
	}

	protected onUnmount() {
		this.abortController?.abort('component unmounted')
	}
}

RootedElement.register(GenericComponent)

const sheet = new CSSStyleSheet()
await sheet.replace(`${GenericComponent.tagName}, ${GenericComponent.tagName}[r] { display: contents !important; }`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
