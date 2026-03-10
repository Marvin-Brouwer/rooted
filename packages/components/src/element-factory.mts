import { isComponent } from './component.mts'
import type { Component } from './component.mts'
import { CssClasses } from './component/classes.mts'
import { componentStore, GenericComponent } from './component/generic-component.mts'
import { RootedElement, RootedElementConstructor } from './rooted-element.mts'

type RootedElementClass<TComponent extends RootedElement> = (new () => TComponent) & RootedElementConstructor
type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B
type WritableKeys<T> = { [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never> }[keyof T]

type RootedElementProps<TComponent extends RootedElement> = Pick<TComponent, WritableKeys<TComponent> & Exclude<keyof TComponent, 'children' | 'className' | 'classList' | keyof RootedElement>>

type HtmlElementProps<TElement extends HTMLElement> = Partial<Pick<TElement, WritableKeys<TElement> & Exclude<keyof TElement, 'children' | 'className' | 'classList'>>> & {
	children?: Array<Node> | Node
	classes?: CssClasses
}

function buildClassList(classes: CssClasses | undefined) {

	if (classes === null || classes === undefined) return {}
	if (Array.isArray(classes)) return { className: classes.filter(Boolean).join(' ') }

	return { className: String(classes) }
}

function createComponent<TComponent extends RootedElement>(component: RootedElementClass<TComponent>, properties: RootedElementProps<TComponent>) {
	return createElement<TComponent>(component.tagName, properties as HtmlElementProps<TComponent>)
}
function createElement<TElement extends HTMLElement>(element: string, properties: HtmlElementProps<TElement>) {
	const { children, classes, ...assignableProperties } = properties
	const newElement = Object.assign(document.createElement(element) as TElement, assignableProperties, buildClassList(classes))

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
 * @todo update docs with new styling approach
 * Creates a new DOM node — either a rooted {@link Component}, a native
 * {@link RootedElement} subclass, or a standard HTML element.
 *
 * The node is **not** appended to the document; use
 * {@link ComponentContext.append} to create-and-append in one step.
 *
 * **DOM property names** — when creating HTML elements, properties are set via
 * `Object.assign` and must use DOM property names, not HTML attribute names:
 * | HTML attribute | DOM property |
 * |---------------|--------------|
 * | `class`       | `className`  |
 * | `for`         | `htmlFor`    |
 * | `readonly`    | `readOnly`   |
 *
 * **Children** — pass a single `Node` or an array of `Node`s via the
 * `children` property; they are appended in order.
 *
 * **Event listeners** — attach them with `addEventListener` after creation, or
 * use the `signal` from {@link ComponentContext} for automatic cleanup on
 * unmount.
 *
 * @example Creating a component
 * ```ts
 * const el = create(MyComponent)
 * const elWithOptions = create(MyComponent, { label: 'hello' })
 * ```
 *
 * @example Creating an HTML element
 * ```ts
 * const div = create('div', {
 *   className: 'card',
 *   children: [
 *     create('h2', { textContent: 'Title' }),
 *     create('p',  { textContent: 'Body'  }),
 *   ],
 * })
 * ```
 */
export function create(component: Component): GenericComponent
export function create<TOptions extends {}>(component: Component<TOptions>, ...args: {} extends TOptions ? [options?: TOptions] : [options: TOptions]): GenericComponent & { options: Readonly<TOptions> }
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