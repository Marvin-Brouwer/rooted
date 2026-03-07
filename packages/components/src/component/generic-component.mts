import { RootedElement } from '../rooted-element.mjs'
import { ComponentConstructor, ComponentContext, definedAt } from '../component.mjs'
import { dev, isDevelopment } from '../dev-helper.mjs'
import { create } from '../element-helper.mjs'
import { pageSignal } from '../page-context.mjs'

type ComponentData = { component: Readonly<ComponentConstructor>, options: Readonly<any> }
const _store = new WeakMap<GenericComponent, ComponentData>()

export function setComponentData(element: GenericComponent, component: ComponentConstructor, options: any) {
	_store.set(element, { component, options })
	dev.appendComponentMetaData?.(element, component, options)
}

export class GenericComponent extends RootedElement {
	public static tagName = isDevelopment() ? 'generic-component' : 'r-gc'

	private abortController = new AbortController()

	protected onMount() {
		const { component, options } = _store.get(this)!

		if (isDevelopment()) {
			this.setAttribute('name', component.name)
		}

		this.style.display = "contents"

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
			if (isDevelopment()) this.innerHTML = error.toString()
		})
	}

	protected onUnmount() {
		this.abortController.abort('component unmounted')
	}
}

RootedElement.register(GenericComponent)