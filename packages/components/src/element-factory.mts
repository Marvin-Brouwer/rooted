import { CssClasses } from './component/classes.mts'
import type { ElementEvents } from './component/events.mts'
import { componentStore, GenericComponent } from './component/generic-component.mts'
import { isComponent } from './component.mts'
import { RootedElement, RootedElementConstructor } from './rooted-element.mts'

import type { Component } from './component.mts'

type RootedElementClass<TComponent extends RootedElement> = (new () => TComponent) & RootedElementConstructor
type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B
type WritableKeys<T> = { [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never> }[keyof T]

type RootedElementProperties<TComponent extends RootedElement> = Pick<TComponent, WritableKeys<TComponent> & Exclude<keyof TComponent, 'children' | 'className' | 'classList' | keyof RootedElement>>

type HtmlElementProperties<TElement extends HTMLElement> = Partial<Pick<TElement, WritableKeys<TElement> & Exclude<keyof TElement, 'children' | 'className' | 'classList'>>> & Partial<ARIAMixin> & {
	children?: Array<Node | string> | Node | string
	classes?: CssClasses
	events?: ElementEvents<TElement>
}

type RequiredKeys<T> = {
	[K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]
type NoRequiredProperties<T> = RequiredKeys<T> extends never ? true : false

function buildEventListeners<TElement extends HTMLElement>(events: ElementEvents<TElement> | undefined, element: TElement) {
	if (!events) return
	const descriptors = Array.isArray(events) ? events : [events]
	for (const descriptor of descriptors) {
		element.addEventListener(descriptor.type as string, descriptor.handler as EventListener, { signal: descriptor.signal })
	}
}

function buildClassList(classes: CssClasses | undefined) {
	if (classes === null || classes === undefined) return {}
	if (Array.isArray(classes)) return { className: classes.filter(Boolean).join(' ') }

	return { className: String(classes) }
}

function createComponent<TComponent extends RootedElement>(component: RootedElementClass<TComponent>, properties: RootedElementProperties<TComponent>) {
	return createElement<TComponent>(component.tagName, properties as HtmlElementProperties<TComponent>)
}
function createElement<TElement extends HTMLElement>(element: string, properties: HtmlElementProperties<TElement>) {
	const { children, classes, events, ...assignableProperties } = properties ?? {}
	const definedProperties = Object.fromEntries(Object
		.entries(assignableProperties)
		.filter(([, v]) => v !== undefined && v !== null),
	)
	const newElement = Object.assign(
		document.createElement(element) as TElement,
		definedProperties,
		buildClassList(classes),
	)

	if (Array.isArray(children)) {
		for (const child of children) {
			newElement.append(child)
		}
	}
	else if (children) {
		newElement.append(children)
	}

	buildEventListeners(events, newElement)

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
export function create<TOptions extends {}>(component: Component<TOptions>, ...arguments_: {} extends TOptions ? [options?: TOptions] : [options: TOptions]): GenericComponent
export function create<TComponent extends RootedElement>(component: RootedElementClass<TComponent>, properties: NoInfer<RootedElementProperties<TComponent>>): TComponent
export function create<KElement extends keyof HTMLElementTagNameMap>(element: KElement, properties: NoInfer<HtmlElementProperties<HTMLElementTagNameMap[KElement]>>): HTMLElementTagNameMap[KElement]
export function create<KElement extends keyof HTMLElementTagNameMap>(
	element: KElement,
): NoRequiredProperties<HtmlElementProperties<HTMLElementTagNameMap[KElement]>> extends true
	? HTMLElementTagNameMap[KElement]
	: never
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
