import { isComponent } from './component.mts'
import type { Component } from './component.mts'
import { componentStore, GenericComponent } from './component/generic-component.mts'
import { RootedElement, RootedElementConstructor } from './rooted-element.mjs'

type RootedElementClass<TComponent extends RootedElement> = (new () => TComponent) & RootedElementConstructor
type RootedElementProps<TComponent extends RootedElement> = Omit<TComponent, 'onMount' | 'children' | keyof RootedElement> & {
	children?: Array<Node> | Node
}

type HtmlElementProps<TElement extends HTMLElement> = Partial<Omit<TElement, 'children'>> & {
	children?: Array<Node> | Node
}

function createComponent<TComponent extends RootedElement>(component: RootedElementClass<TComponent>, properties: RootedElementProps<TComponent>) {
	return createElement<TComponent>(component.tagName, properties as HtmlElementProps<TComponent>)
}
function createElement<TElement extends HTMLElement>(element: string, properties: HtmlElementProps<TElement>) {
	const { children, ...assignableProperties } = properties
	const newElement = Object.assign(document.createElement(element) as TElement, assignableProperties)

	if (Array.isArray(children)) {
		for (const child of children) {
			newElement.append(child)
		}
	} else if (children) {
		newElement.append(children)
	}

	return newElement
}

/**
 * ## Create a new `component`
 *
 * Initializes a new component
 */
export function create(component: Component): GenericComponent
export function create<TOptions extends {}>(component: Component<TOptions>, options: TOptions): GenericComponent & { options: Readonly<TOptions> }
export function create<TComponent extends RootedElement>(component: RootedElementClass<TComponent>, properties: NoInfer<RootedElementProps<TComponent>>): TComponent
export function create<KElement extends keyof HTMLElementTagNameMap>(element: KElement, properties: NoInfer<HtmlElementProps<HTMLElementTagNameMap[KElement]>>): HTMLElementTagNameMap[KElement]
export function create(
	component: Component<any> | string | RootedElementClass<RootedElement>, properties?: unknown): unknown {

	if (isComponent(component)) {
		const element = document.createElement(GenericComponent.tagName) as GenericComponent
		componentStore.set(element, component, properties)
		return element
	}

	if (typeof component === 'string')
		return createElement(component, properties as any)

	return createComponent(component, properties as any)
}