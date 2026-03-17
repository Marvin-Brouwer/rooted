import { isDevelopment } from '@rooted/util/dev'

import { ComponentConstructor, ComponentContext } from '../component.mts'
import { devHelper } from '../dev-helper.mts'
import { create } from '../element-factory.mts'
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
 * ## The Generic component store
 *
 * This store is a weak map used to create instances of the Generic component, programmatically,
 * without having the properties accessible through the console window. \
 * We want this for security reasons, malicious users shouldn't be able to inspect internal runtime state.
 *
 * During dev mode, these properties are made accessible.
 */
export const componentStore = createComponentStore()

/**
 * The internal custom element that wraps every functional {@link Component}.
 *
 * When you call `create(MyComponent)`, rooted creates an instance of
 * `GenericComponent` (tag name `<r-->` in production, `<rooted-component>`
 * in development) and stores the component constructor and options in a private
 * `WeakMap`. On `connectedCallback` the component's `onMount` is invoked with
 * a fully typed {@link ComponentContext}.
 *
 * You will encounter this type in TypeScript signatures — for example,
 * `create(MyComponent)` returns `GenericComponent` — but you should not
 * instantiate or subclass it directly. Always use {@link component} and
 * {@link create} instead.
 *
 * In development the element also exposes `component`, `options`, and
 * `definedAt` as direct properties so they are visible in browser DevTools.
 * These properties are absent in production builds.
 *
 * @see {@link component}
 * @see {@link create}
 * @see {@link componentStore}
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

		function append<T extends Node | string | GenericComponent>(node: T): T
		function append<T extends Node | string | GenericComponent>(...node: T[]): T[]
		function append(...nodes: (Node | string | GenericComponent)[]): Node[]
		function append(...nodes: (Node | string | GenericComponent)[]): Node[] | Node {
			const realNodes = nodes.map((nodeOrString) => {
				return typeof nodeOrString === 'string'
					? document.createTextNode(nodeOrString)
					: nodeOrString as Node
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
					: nodeOrString as Node
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
					: nodeOrString as Node
			})

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
					: nodeOrString as Node
			})

			for (const node of realNodes)
				// eslint-disable-next-line unicorn/prefer-dom-node-remove -- remove does not exist on type Node
				base.removeChild(node)

			return nodes.length === 1
				? realNodes[0]
				: realNodes
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const context: ComponentContext<any> = {
			signal: this.abortController.signal,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			options,
			create,
			append,
			prepend,
			insertBefore: base.insertBefore.bind(base),
			swap: base.replaceChild.bind(base),
			replace,
			remove,
		}

		const handleError = (error: unknown) => {
			console.error(`[component] Mounting ${component.name} failed`, error)
			if (isDevelopment()) {
				this.append(create('pre', {
					role: 'alert',
					textContent: String(error),
				}))
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
		this.abortController.abort('component unmounted')
	}
}

RootedElement.register(GenericComponent)

const sheet = new CSSStyleSheet()
await sheet.replace(`${GenericComponent.tagName}, ${GenericComponent.tagName}[r] { display: contents !important; }`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
