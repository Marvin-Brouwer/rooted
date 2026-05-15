import { isComponent } from './component.mts'
import { componentStore, GenericComponent } from './component/generic-component.mts'
import { RootedElement, RootedElementConstructor } from './rooted-element.mts'

import type { Component } from './component.mts'

type RootedElementClass<TComponent extends RootedElement> = (new () => TComponent) & RootedElementConstructor
type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B
type WritableKeys<T> = { [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never> }[keyof T]

type RootedElementProperties<TComponent extends RootedElement> = Pick<TComponent, WritableKeys<TComponent> & Exclude<keyof TComponent, 'children' | 'className' | 'classList' | keyof RootedElement>>

type HtmlComponentProperties<TElement extends HTMLElement> = Partial<Pick<TElement, WritableKeys<TElement> & Exclude<keyof TElement, 'children' | 'className' | 'classList'>>> & Partial<ARIAMixin> & {
	children?: Array<Node | string> | Node | string
}

function createElement<TElement extends HTMLElement>(element: string, properties: HtmlComponentProperties<TElement>) {
	const { children, ...assignableProperties } = properties ?? {}
	const definedProperties = Object.fromEntries(Object
		.entries(assignableProperties)
		.filter(([, v]) => v !== undefined && v !== null),
	)
	const newElement = Object.assign(
		document.createElement(element) as TElement,
		definedProperties,
	)

	if (Array.isArray(children)) {
		for (const child of children) {
			newElement.append(child)
		}
	}
	else if (children) {
		newElement.append(children)
	}

	return newElement
}

/**
 * Builds a node without mounting it. Pass a {@link Component} (made with the
 * `component()` factory) or a {@link RootedElement} subclass. To build a
 * standard HTML or SVG element, use the `element(...)` factory from the mount
 * context instead.
 *
 * Use `create(...)` when you want a reference to the node before appending it.
 * Use `append(...)` from the mount context to create and append in one step.
 *
 * @example
 * ```ts
 * const counter = create(Counter)
 * const counterWithOptions = create(Counter, { label: 'hello' })
 * ```
 */
export function create(component: Component): GenericComponent
export function create<TOptions extends object>(component: Component<TOptions>, ...arguments_: object extends TOptions ? [options?: TOptions] : [options: TOptions]): GenericComponent
export function create<TComponent extends RootedElement>(component: RootedElementClass<TComponent>, properties: NoInfer<RootedElementProperties<TComponent>>): TComponent
export function create(
	component: Component<object> | RootedElementClass<RootedElement>, properties?: unknown): unknown {
	if (isComponent(component)) {
		const element = document.createElement(GenericComponent.tagName) as GenericComponent
		componentStore.set(element, component, properties)
		return element
	}

	return createElement<RootedElement>(component.tagName, (properties ?? {}))
}
