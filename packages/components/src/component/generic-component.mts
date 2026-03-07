import { RootedElement } from '../rooted-element.mjs'
import { ComponentConstructor, ComponentContext, scopeId } from '../component.mjs'
import { dev, isDevelopment } from '../dev-helper.mjs'
import { create } from '../element-helper.mjs'
import { pageSignal } from '../page-context.mjs'
import { applyStyles } from './styles.mts'


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

export class GenericComponent extends RootedElement {
	public static tagName = isDevelopment() ? 'generic-component' : 'r-gc'

	private abortController = new AbortController()

	protected onMount() {
		const { component, options } = componentStore.get<any>(this)!

		this.setAttribute(component[scopeId]!, '')
		if (isDevelopment()) this.setAttribute('name', component.name)

		this.style.display = "contents"
		applyStyles(this, component)

		// Re-create to cover remounting
		this.abortController.abort('remounted')
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

		Promise.resolve(component.onMount.call(context, context)).catch(error => {
			console.error(`[component] Mounting ${component.name} failed`, error)
			if (isDevelopment()) {
				this.append(create('pre', {
					role: 'error-display',
					textContent: error.toString()
				}))
			}
		})
	}

	protected onUnmount() {
		this.abortController.abort('component unmounted')
	}
}

RootedElement.register(GenericComponent)