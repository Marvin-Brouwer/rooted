import { componentStore, GenericComponent } from './component/generic-component.mts'
import { isComponent } from './component.mts'
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
 * Creates a new DOM node — either a rooted {@link Component}, a native
 * {@link RootedElement} subclass, or a standard HTML element.
 *
 * The node is **not** appended to the document; use
 * {@link ComponentContext.append} to create-and-append in one step.
 *
 * **`classes`** — use the `classes` prop to set CSS classes on HTML elements.
 * Accepts a single class string or a {@link CssClasses} array; falsy entries
 * are filtered out automatically. Use {@link cssClass} for conditional classes:
 * ```ts
 * import { cssClass } from '@rooted/components'
 * append('button', { classes: ['btn', cssClass('btn--active', isActive)] })
 * ```
 *
 * **DOM property names** — other properties are set via `Object.assign` and
 * must use DOM property names, not HTML attribute names:
 * | HTML attribute | DOM property |
 * |---------------|--------------|
 * | `for`         | `htmlFor`    |
 * | `readonly`    | `readOnly`   |
 *
 * **Children** — pass a single `Node` or an array of `Node`s via the
 * `children` property; they are appended in order.
 *
 * **Event listeners** — use the `events` prop with descriptors created by the
 * `on` helper from {@link ComponentContext}. Listeners are automatically
 * removed when the component unmounts:
 * ```ts
 * create('button', {
 *   events: [on('click', e => { e.currentTarget.disabled = true })]
 * })
 * ```
 * You can also pass a single descriptor without an array. To pre-define
 * events outside of `onMount`, use {@link createEventBuilder} from
 * `@rooted/components/elements` with your own `AbortSignal`.
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
 *   classes: 'card',
 *   children: [
 *     create('h2', { textContent: 'Title' }),
 *     create('p',  { textContent: 'Body'  }),
 *   ],
 * })
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

	return createElement<RootedElement>(component.tagName, (properties ?? {}) as HtmlComponentProperties<RootedElement>)
}
