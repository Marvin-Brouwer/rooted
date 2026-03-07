import { RootedElement } from '../rooted-element.mjs'
import { ComponentConstructor, ComponentContext } from '../component.mjs'
import { isDevelopment } from '../dev-helper.mjs'
import { create } from '../element-helper.mjs'
import { pageSignal } from '../page-context.mjs'

export class GenericComponent extends RootedElement {
	public static tagName = isDevelopment() ? 'generic-component' : 'gc'

	public component!: Readonly<ComponentConstructor>
	public options!: Readonly<any>

	private abortController = new AbortController()

	protected onMount() {
		this.setAttribute('name', this.component.name)

		// Re-create to cover remounting
		this.abortController.abort('remounted')
		this.abortController = new AbortController()
		pageSignal.addEventListener('abort', (reason) => this.abortController.abort(reason), {
			// Un register on unmount if the page is still alive
			signal: this.abortController.signal
		})

		const context: ComponentContext = {
			signal: this.abortController.signal,
			create,
			// TODO also prepend etc
			append: ((...forwardParameters: Parameters<typeof create>) => {
				const element = create(...forwardParameters)
				this.append(element)
				return element
			}) as typeof create
		}

		Promise.resolve(this.component.onMount.call(context, context)).catch(error => {
			console.error(`[component] Mounting ${this.component.name} failed`, error)
			if (isDevelopment()) this.innerHTML = error.toString()
		})
	}

	protected onUnmount() {
		this.abortController.abort('component unmounted')
	}
}

RootedElement.register(GenericComponent)