import { RootedElement } from '../rooted-element.mts'
import { ComponentConstructor, ComponentContext, scopeId } from '../component.mts'
import { create } from '../element-factory.mts'
import { pageSignal } from '../page-context.mts'
import { applyStyles } from './styles.mts'
import { isDevelopment } from '@rooted/util/dev'
import { dev } from '../dev-helper.mts'


type ComponentData<T> = {
	component: Readonly<ComponentConstructor>,
	options: T
}

function createComponentStore() {

	const store = new WeakMap<GenericComponent, ComponentData<unknown>>()

	function set(element: GenericComponent, component: ComponentConstructor, options: unknown) {
		store.set(element, { component, options })
		dev.appendComponentMetaData?.(element, component, options)
	}

	function get<T>(element: GenericComponent) {
		return store.get(element) as ComponentData<T>
	}

	return {
		get, set
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
		const data = componentStore.get<any>(this)
		if (!data) throw new Error('[rooted] GenericComponent mounted without component data. Use create() to instantiate components.')
		const { component, options } = data

		if (component[scopeId]) this.setAttribute(component[scopeId], '')
		if (isDevelopment()) this.setAttribute('data-component', component.name)

		this.style.setProperty('display', 'contents', 'important')
		applyStyles(this, component)

		// Re-create to cover remounting
		this.abortController?.abort('remounted')
		this.abortController = new AbortController()
		pageSignal.addEventListener('abort', (reason) => this.abortController.abort(reason), {
			// Un register on unmount if the page is still alive
			signal: this.abortController.signal
		})

		const context: ComponentContext<any> = {
			signal: this.abortController.signal,
			options,
			create,
			// TODO also prepend etc
			append: ((...forwardParameters: Parameters<typeof create>) => {
				const element = create(...forwardParameters)
				this.append(element)
				return element
			}) as typeof create
		}

		const handleError = (error: unknown) => {
			console.error(`[component] Mounting ${component.name} failed`, error)
			if (isDevelopment()) {
				this.append(create('pre', {
					role: 'alert',
					textContent: String(error)
				}))
			}
		}

		try {
			Promise.resolve(component.onMount.call(context, context)).catch(handleError)
		} catch (error) {
			handleError(error)
		}
	}

	protected onUnmount() {
		this.abortController.abort('component unmounted')
	}
}

RootedElement.register(GenericComponent)