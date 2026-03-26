import { DeferredEventDescriptor, ElementEvents, EventDescriptor } from '@rooted/events'

import { type Aria, buildAriaProperties } from './aria.mts'
import { CssClasses } from './classes.mts'

type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B
type NonWritableKeys<T> = {
	[P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, never, P>
}[keyof T]
type FunctionKeys<T> = {
	[P in keyof T]: NonNullable<T[P]> extends (...arguments_: never[]) => unknown ? P : never
}[keyof T]

type SanitizedHtmlProperties<TElement extends HTMLElement> = Omit<
	TElement,
	| NonWritableKeys<TElement>
	| FunctionKeys<TElement>
	| Exclude<keyof ARIAMixin, 'role'>
	| 'children' | 'className' | 'classList'
>
type HtmlElementPropertiesMapped<TElement extends HTMLElement>
	= Partial<SanitizedHtmlProperties<TElement>>
	& {
		children?: Array<Node | string> | Node | string
		classes?: CssClasses
		aria?: Aria
		events?: ElementEvents<TElement>
	}

type HtmlElementProperties<KElement extends keyof HTMLElementTagNameMap>
	= HtmlElementPropertiesMapped<HTMLElementTagNameMap[KElement]>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDescriptor = EventDescriptor<any> | DeferredEventDescriptor<any, any>
function buildEventListeners<TElement extends HTMLElement>(events: ElementEvents<TElement> | undefined, element: TElement) {
	if (!events) return
	const descriptors: (AnyDescriptor | undefined)[] = Array.isArray(events) ? events : [events]
	for (const descriptor of descriptors) {
		if (!descriptor) continue
		element.addEventListener(descriptor.key as string, descriptor.handler as unknown as EventListener, { signal: descriptor.signal })
	}
}

function buildClassList(classes: CssClasses | undefined) {
	if (classes === null || classes === undefined) return {}
	if (Array.isArray(classes)) return { className: classes.filter(Boolean).join(' ') }

	return { className: String(classes) }
}

export type ElementCreator = (key: string) => HTMLElement
export type ElementFactory = ReturnType<typeof createElementFactory>
export function createElementFactory(constructElement: ElementCreator) {
	/**
	 * Creates a new HTML element. The element is **not** appended to the
	 * document automatically.
	 *
	 * **`classes`** — accepts a single class string or a {@link CssClasses} array;
	 * falsy entries are filtered out automatically.
	 *
	 * **DOM property names** — other properties are set via `Object.assign` and
	 * must use DOM property names, not HTML attribute names:
	 * | HTML attribute | DOM property |
	 * |----------------|--------------|
	 * | `for`          | `htmlFor`    |
	 * | `readonly`     | `readOnly`   |
	 *
	 * **Children** — pass a single `Node` or an array of `Node`s via the
	 * `children` property; they are appended in order.
	 *
	 * **Event listeners** — use the `events` prop with event descriptors.
	 *
	 * **ARIA** — use the `aria` prop for ARIA attributes. Accepts string IDs or
	 * `Element` references for IDL reflection properties.
	 *
	 * @example
	 * ```ts
	 * const div = create('div', {
	 *   classes: 'card',
	 *   aria: { label: 'Card', labelledBy: headingEl },
	 *   children: [
	 *     create('h2', { textContent: 'Title' }),
	 *     create('p',  { textContent: 'Body'  }),
	 *   ],
	 * })
	 * ```
	 */
	function createElement<KElement extends keyof HTMLElementTagNameMap>(tag: KElement, properties?: NoInfer<HtmlElementProperties<KElement>>): HTMLElementTagNameMap[KElement] {
		const { aria, children, classes, events, ...assignableProperties } = (properties ?? {})
		const definedProperties = Object.fromEntries(Object
			.entries(assignableProperties)
			.filter(([, v]) => v !== undefined && v !== null),
		)
		const newElement = Object.assign(
			constructElement(tag) as HTMLElementTagNameMap[KElement],
			definedProperties,
			buildClassList(classes),
		)

		buildAriaProperties(aria, newElement)

		if (Array.isArray(children)) {
			for (const child of children) {
				newElement.append(child)
			}
		}
		else if (children) {
			newElement.append(children)
		}

		buildEventListeners(events, newElement)

		return newElement as HTMLElementTagNameMap[KElement]
	}

	return createElement.bind(undefined!)
}
