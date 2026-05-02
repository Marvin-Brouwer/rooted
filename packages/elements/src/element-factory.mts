import { ElementOnHandlers } from '@rooted/events'

import { type Aria, buildAriaProperties } from './aria.mts'
import { CssClasses } from './classes.mts'
import { HtmlElementProperties } from './html-element-properties.mts'
import { SvgElementProperties, SvgTagElement, SvgTagName } from './svg-element-properties.mts'

function buildOnHandlers<TElement extends Element>(
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

function isWritableDomProperty(element: Element, key: string): boolean {
	let proto: object | null = element
	while (proto) {
		const desc = Object.getOwnPropertyDescriptor(proto, key)
		if (desc) return !!(desc.writable || desc.set)
		proto = Object.getPrototypeOf(proto) as object | null
	}
	return false
}

export type ElementCreator = (key: string, ns?: string) => Element

/**
 * The overloaded function type returned by {@link createElementFactory}.
 * Accepts HTML or SVG tag names and returns the matching element type.
 */
export interface ElementCreatorFunction {
	(tag: 'svg', properties?: SvgElementProperties<'svg'>): SVGSVGElement
	<K extends Exclude<SvgTagName, 'svg'>>(tag: K, properties?: SvgElementProperties<K>): SvgTagElement<K>
	<K extends keyof HTMLElementTagNameMap>(tag: K, properties?: NoInfer<HtmlElementProperties<K>>): HTMLElementTagNameMap[K]
}

export type ElementFactory = ElementCreatorFunction
export function createElementFactory(constructElement: ElementCreator, signal: AbortSignal): ElementCreatorFunction {
	/**
	 * Creates a new HTML or SVG element. The element is **not** appended to the
	 * document automatically.
	 *
	 * **HTML elements** — pass any tag from `HTMLElementTagNameMap`:
	 * ```ts
	 * element('div', { classes: 'card', children: [...] })
	 * ```
	 *
	 * **SVG elements** — use `'svg'` for the root element, or prefix other SVG
	 * tags with `'svg:'` to avoid collisions with same-named HTML tags:
	 * ```ts
	 * element('svg', { viewBox: '0 0 24 24', children: element('svg:use', { href: url }) })
	 * ```
	 *
	 * **`classes`** — accepts a single class string or a {@link CssClasses} array;
	 * falsy entries are filtered out automatically.
	 *
	 * **DOM property names** — for HTML elements, other properties are set via
	 * `Object.assign` and must use DOM property names, not HTML attribute names:
	 * | HTML attribute | DOM property |
	 * |----------------|--------------|
	 * | `for`          | `htmlFor`    |
	 * | `readonly`     | `readOnly`   |
	 *
	 * For SVG elements, writable DOM properties are set directly; anything else
	 * (e.g. `viewBox`, `href`) falls back to `setAttribute` automatically.
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
	 * const div = element('div', {
	 *   classes: 'card',
	 *   aria: { label: 'Card', labelledBy: headingEl },
	 *   children: [
	 *     element('h2', { textContent: 'Title' }),
	 *     element('p',  { textContent: 'Body'  }),
	 *   ],
	 * })
	 *
	 * const icon = element('svg', {
	 *   viewBox: '0 0 24 24',
	 *   aria: { hidden: 'true' },
	 *   children: element('svg:use', { href: spriteUrl }),
	 * })
	 * ```
	 */
	function createElement(tag: 'svg', properties?: SvgElementProperties<'svg'>): SVGSVGElement
	function createElement<K extends Exclude<SvgTagName, 'svg'>>(tag: K, properties?: SvgElementProperties<K>): SvgTagElement<K>
	function createElement<KElement extends keyof HTMLElementTagNameMap>(tag: KElement, properties?: NoInfer<HtmlElementProperties<KElement>>): HTMLElementTagNameMap[KElement]
	function createElement(tag: string, properties?: Record<string, unknown>): Element {
		if (tag === 'svg' || tag.startsWith('svg:')) {
			const actualTag = tag === 'svg' ? 'svg' : tag.slice(4)
			const { classes, children, aria, on, style, ...attributes } = properties ?? {}
			const newElement = constructElement(actualTag, 'http://www.w3.org/2000/svg') as SVGElement

			for (const [key, value] of Object.entries(attributes)) {
				if (value === undefined || value === null) continue
				if (isWritableDomProperty(newElement, key)) {
					;(newElement as unknown as Record<string, unknown>)[key] = value
				}
				else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
					newElement.setAttribute(key, String(value))
				}
			}

			const { className } = buildClassList(classes as CssClasses | undefined)
			if (className) newElement.setAttribute('class', className)

			if (style) Object.assign(newElement.style, style)
			buildAriaProperties(aria as Aria | undefined, newElement)
			buildOnHandlers(on as ElementOnHandlers<Element> | undefined, newElement, signal)

			appendChildren(newElement, children as Array<Node | string> | Node | string | undefined)

			return newElement
		}

		const { aria, children, classes, on, style, ...assignableProperties } = properties ?? {}
		const newElement = constructElement(tag) as HTMLElement

		const { className } = buildClassList(classes as CssClasses | undefined)
		if (className) newElement.className = className

		for (const [key, value] of Object.entries(assignableProperties)) {
			if (value === undefined || value === null) continue
			if (isWritableDomProperty(newElement, key)) {
				;(newElement as unknown as Record<string, unknown>)[key] = value
			}
			else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				newElement.setAttribute(key, String(value))
			}
		}

		if (style) Object.assign(newElement.style, style)
		buildAriaProperties(aria as Aria | undefined, newElement)
		buildOnHandlers(on as ElementOnHandlers<HTMLElement> | undefined, newElement, signal)
		appendChildren(newElement, children as Array<Node | string> | Node | string | undefined)

		return newElement
	}

	return createElement
}

function appendChildren(element: Element, children: Array<Node | string> | Node | string | undefined): void {
	if (Array.isArray(children)) {
		for (const child of children) {
			element.append(child)
		}
	}
	else if (children) {
		element.append(children)
	}
}
