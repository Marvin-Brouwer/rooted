import { isComponent } from './component.mts'
import type { Component } from './component.mts'
import { componentStore, GenericComponent } from './component/generic-component.mts'
import { RootedElement, RootedElementConstructor } from './rooted-element.mts'

type RootedElementClass<TComponent extends RootedElement> = (new () => TComponent) & RootedElementConstructor
type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B
type WritableKeys<T> = { [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never> }[keyof T]

type RootedElementProps<TComponent extends RootedElement> = Pick<TComponent, WritableKeys<TComponent> & Exclude<keyof TComponent, 'children' | keyof RootedElement>> & {
	children?: Array<Node> | Node
}

type HtmlElementProps<TElement extends HTMLElement> = Partial<Pick<TElement, WritableKeys<TElement> & Exclude<keyof TElement, 'children'>>> & {
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
 * ## Create a new element or component
 *
 * When creating HTML elements, properties are set via `Object.assign` and therefore
 * must use **DOM property names**, not HTML attribute names:
 * - Use `className` instead of `class`
 * - Use `htmlFor` instead of `for`
 * - Use `readOnly` instead of `readonly`
 *
 * Event listeners should be attached via `addEventListener` after creation,
 * or by passing an `AbortSignal`-aware listener using the `signal` from the component context.
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