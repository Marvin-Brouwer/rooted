import { ElementOnHandlers } from '@rooted/events'

import { type Aria, buildAriaProperties } from './aria.mts'
import { CssClasses } from './classes.mts'

type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B
type NonWritableKeys<T> = {
	[P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, never, P>
}[keyof T]
type FunctionKeys<T> = {
	[P in keyof T]: NonNullable<T[P]> extends (...arguments_: never[]) => unknown ? P : never
}[keyof T]
type OnHandlerKeys<T> = { [P in keyof T]: P extends `on${string}` ? P : never }[keyof T]

type SanitizedHtmlProperties<TElement extends HTMLElement> = Omit<
	TElement,
	| NonWritableKeys<TElement>
	| FunctionKeys<TElement>
	| Exclude<keyof ARIAMixin, 'role'>
	| OnHandlerKeys<TElement>
	| 'children' | 'className' | 'classList'
>
type HtmlElementPropertiesMapped<TElement extends HTMLElement>
	= Partial<SanitizedHtmlProperties<TElement>>
	& {
		children?: Array<Node | string> | Node | string
		classes?: CssClasses
		aria?: Aria
		on?: ElementOnHandlers<TElement>
	}

type HtmlElementProperties<KElement extends keyof HTMLElementTagNameMap>
	= HtmlElementPropertiesMapped<HTMLElementTagNameMap[KElement]>

function buildOnHandlers<TElement extends HTMLElement>(
	on: ElementOnHandlers<TElement> | undefined,
	element: TElement,
	signal: AbortSignal,
): void {
	if (!on) return
	for (const [key, handler] of Object.entries(on)) {
		if (!handler) continue
		element.addEventListener(
			key,

			event => void (handler as (event?: Event) => void | Promise<void>)(event),
			signal ? { signal } : undefined,
		)
	}
}

function buildClassList(classes: CssClasses | undefined) {
	if (classes === null || classes === undefined) return {}
	if (Array.isArray(classes)) return { className: classes.filter(Boolean).join(' ') }

	return { className: String(classes) }
}

export type ElementCreator = (key: string) => HTMLElement
export type ElementFactory = ReturnType<typeof createElementFactory>
export function createElementFactory(constructElement: ElementCreator, signal: AbortSignal) {
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
	 * **Event listeners** — use the `on` prop with an object of event handlers.
	 * Listeners are automatically removed when the component unmounts.
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
		const { aria, children, classes, on, ...assignableProperties } = (properties ?? {})
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
		buildOnHandlers(on, newElement, signal)

		if (Array.isArray(children)) {
			for (const child of children) {
				newElement.append(child)
			}
		}
		else if (children) {
			newElement.append(children)
		}

		return newElement as HTMLElementTagNameMap[KElement]
	}

	return createElement.bind(undefined!)
}
