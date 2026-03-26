import { CustomEvent } from './custom-event.mts'

declare class SyntheticEventElement<M extends Record<string, Event>> extends Element {
	private declare _m: M
}

export type ElementEventMap<T extends Element>
	= T extends HTMLElement ? HTMLElementEventMap
	: T extends SVGElement ? SVGElementEventMap
	: T extends SyntheticEventElement<infer M> ? M
	: Record<string, Event>
export type ElementKeys = keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap
export type ElementMap<K extends ElementKeys>
	= K extends keyof HTMLElementTagNameMap
	? HTMLElementTagNameMap[K]
	: K extends keyof SVGElementTagNameMap
	? SVGElementTagNameMap[K]
	: Element

/**
 * An augmented DOM event with a narrowed `currentTarget` type.
 *
 * DOM's built-in `currentTarget` is typed as `EventTarget | null`; this type
 * tightens it to the actual element so you can access element-specific
 * properties without casting.
 *
 * @typeParam TEvent - The underlying DOM event type (e.g. `MouseEvent`).
 * @typeParam TTarget - The element type the listener is attached to.
 *
 * @example
 * ```ts
 * on('click', (e: TargetedEvent<MouseEvent, HTMLButtonElement>) => {
 *   e.currentTarget.disabled = true
 * })
 * ```
 */
export type TargetedEvent<TEvent, TTarget extends EventTarget>
	= TEvent & { readonly currentTarget: TTarget }

/**
 * A deferred event descriptor produced by {@link EventBuilder}.
 *
 * Carries the event `type`, `handler`, and the `AbortSignal` that will be
 * used to remove the listener when the component unmounts. Pass these in the
 * `events` property of any `create()` / `append()` call.
 *
 * You will not typically construct this type directly — use the `on` helper
 * available on {@link ComponentContext} or {@link createEventBuilder}.
 *
 * @typeParam TElement - Element type the listener targets (HTML or SVG).
 * @typeParam K - The specific event name key (defaults to the full event map).
 */
export class EventDescriptor<
	TElement extends Element,
	EventKey extends keyof ElementEventMap<TElement> = keyof ElementEventMap<TElement>,
> {
	constructor(
		readonly key: EventKey,
		readonly tag: TElement['tagName'],
		readonly handler: EventHandler<TElement, EventKey>,
		readonly signal: AbortSignal,
	) {}
}

export type EventHandler<TElement extends Element, EventKey extends keyof ElementEventMap<TElement>>
	= (event: TargetedEvent<ElementEventMap<TElement>[EventKey], TElement>) => void | Promise<void>

/**
 * One or more {@link EventDescriptor} values accepted by the `events` prop
 * of every element created via `create()` or `append()`.
 *
 * - A single descriptor is applied as-is.
 * - An array of descriptors is iterated in order.
 *
 * @see {@link EventBuilder} for creating descriptors with the `on` helper.
 */
export type ElementEvents<TElement extends Element>
	= Array<EventDescriptor<TElement>> | EventDescriptor<TElement>

export type EventDefinition = CustomEvent | EventDescriptor<Element>

export type EventBuilder = ReturnType<typeof createEventBuilder>
export function createEventBuilder(eventTarget: Element, abortSignal: AbortSignal) {
	function createWindowEventListener<K extends keyof WindowEventMap>(
		target: 'window', key: K, handler: (event: TargetedEvent<WindowEventMap[K], Window>) => void | Promise<void>,
	) {
		void target
		globalThis.window.addEventListener(
			key,
			event => void handler(event as TargetedEvent<typeof event, Window>),
			{ signal: abortSignal },
		)
	}

	function createDocumentEventListener<K extends keyof DocumentEventMap>(
		target: 'document', key: K, handler: (event: TargetedEvent<DocumentEventMap[K], Document>) => void | Promise<void>,
	) {
		void target
		eventTarget.ownerDocument.addEventListener(
			key,
			event => void handler(event as TargetedEvent<typeof event, Document>),
			{ signal: abortSignal },
		)
	}

	function createInferredEventListener<
		TElement extends HTMLElement,
		EventKey extends keyof ElementEventMap<TElement>,
	>(key: EventKey, handler: NoInfer<EventHandler<TElement, EventKey>>) {
		// @claude I've built it to rely on the tagname heavily,
		// how do we infer the actual tag name? or solve it differently
		const tag = 'unknown' as TElement['tagName']
		return new EventDescriptor(
			key,
			tag,
			handler,
			abortSignal,
		)
	}

	function createElementEventListener<
		KElement extends ElementKeys,
		EventKey extends keyof ElementEventMap<ElementMap<KElement>>,
	>(tag: KElement, key: EventKey, handler: NoInfer<EventHandler<ElementMap<KElement>, EventKey>>) {
		return new EventDescriptor(
			key,
			tag,
			handler,
			abortSignal,
		)
	}

	return Object.assign(
		createWindowEventListener,
		createDocumentEventListener,
		createInferredEventListener,
		createElementEventListener,
	)
}
