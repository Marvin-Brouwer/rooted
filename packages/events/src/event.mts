export type ElementEventMap<T extends Element>
	= T extends HTMLElement ? HTMLElementEventMap
	: T extends SVGElement ? SVGElementEventMap
	: Record<string, Event>
export type ElementKeys = keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap
export type ElementMap<K extends ElementKeys>
	= K extends keyof HTMLElementTagNameMap
	? HTMLElementTagNameMap[K]
	: K extends keyof SVGElementTagNameMap
	? SVGElementTagNameMap[K]
	: Element

// Events defined in GlobalEventHandlersEventMap that are only meaningful
// on specific element types (input, select, textarea, form) and should
// not appear as valid forwardEvent targets on generic elements.
type ElementSpecificEvents = 'change' | 'input' | 'invalid' | 'select'
// Tags that have specific-event interfaces defined in TypeScript's DOM lib
type FormControlTags = 'input' | 'select' | 'textarea' | 'form'

/**
 * Maps an element tag name to the event map that is semantically applicable
 * to that element. Elements with their own DOM event map interface use it;
 * all other HTML elements use {@link HTMLElementEventMap} minus events that
 * are exclusive to form-control element types.
 *
 * TypeScript 5.9's DOM lib provides {@link HTMLMediaElementEventMap} and
 * {@link HTMLVideoElementEventMap}; form-control events are restricted by
 * tag-name literal rather than by a dedicated event-map interface.
 */
export type TagSpecificEventMap<K extends ElementKeys>
	= K extends keyof HTMLElementTagNameMap
	? K extends FormControlTags
	? HTMLElementEventMap
	: HTMLElementTagNameMap[K] extends HTMLVideoElement ? HTMLVideoElementEventMap
	: HTMLElementTagNameMap[K] extends HTMLMediaElement ? HTMLMediaElementEventMap
	: Omit<HTMLElementEventMap, ElementSpecificEvents>
	: K extends keyof SVGElementTagNameMap ? SVGElementEventMap
	: Record<string, Event>

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
export type TargetedEvent<TEvent extends Event, TTarget extends EventTarget>
	= Omit<TEvent, 'currentTarget'> & { readonly currentTarget: TTarget }

// Resolves a tag name string or element class to a concrete element class.
type ResolvedElement<T extends Element | ElementKeys>
	= T extends ElementKeys ? ElementMap<T> : T extends Element ? T : never

/**
 * A typed event handler for a DOM element event.
 *
 * Accepts either an element class or a tag name string as the first type
 * parameter:
 * - `EventHandler<'button', 'click'>` — tag name form (recommended for options types)
 * - `EventHandler<HTMLButtonElement, 'click'>` — element class form
 *
 * Both forms produce the same handler type. The handler may optionally accept
 * the typed event object, or take no arguments at all.
 *
 * @typeParam TElementOrTag - The element type or tag name string.
 * @typeParam EventKey - The event name key.
 *
 * @example
 * ```ts
 * // In a component options type:
 * type ButtonOptions = {
 *   on?: { click?: EventHandler<'button', 'click'> }
 * }
 * ```
 */
export type EventHandler<
	TElementOrTag extends Element | ElementKeys,
	EventKey extends keyof ElementEventMap<ResolvedElement<TElementOrTag>>,
> =
	| ((event: TargetedEvent<
		ElementEventMap<ResolvedElement<TElementOrTag>>[EventKey] & Event,
		ResolvedElement<TElementOrTag>
	>) => void | Promise<void>)
	| (() => void | Promise<void>)

/**
 * A map of optional event handlers for all events applicable to a given HTML
 * element. Used as the type of the `on` prop in element factory calls.
 *
 * Handler values are contextually typed from the surrounding element's event
 * map — no explicit annotation needed.
 *
 * @example
 * ```ts
 * element('input', {
 *   on: {
 *     input(e) { e.currentTarget.value },  // e.currentTarget: HTMLInputElement
 *     change() { },
 *   }
 * })
 * ```
 */
export type ElementOnHandlers<TElement extends HTMLElement> = {
	[K in keyof ElementEventMap<TElement> & string]?:
		| ((event: TargetedEvent<ElementEventMap<TElement>[K] & Event, TElement>) => void | Promise<void>)
		| (() => void | Promise<void>)
}

export type EventBuilder = ReturnType<typeof createEventBuilder>
export function createEventBuilder(eventTarget: Element, abortSignal: AbortSignal) {
	function createWindowEventListener<K extends keyof WindowEventMap>(
		target: 'window', key: K,
		handler:
			| ((event: TargetedEvent<WindowEventMap[K], Window>) => void | Promise<void>)
			| (() => void | Promise<void>),
	) {
		void target
		globalThis.window.addEventListener(
			key,
			event => void (handler as (event?: TargetedEvent<WindowEventMap[K], Window>) => void | Promise<void>)(
				event as unknown as TargetedEvent<typeof event, Window>,
			),
			{ signal: abortSignal },
		)
	}

	function createDocumentEventListener<K extends keyof DocumentEventMap>(
		target: 'document', key: K,
		handler:
			| ((event: TargetedEvent<DocumentEventMap[K], Document>) => void | Promise<void>)
			| (() => void | Promise<void>),
	) {
		void target
		eventTarget.ownerDocument.addEventListener(
			key,
			event => void (handler as (event?: TargetedEvent<DocumentEventMap[K], Document>) => void | Promise<void>)(
				event as unknown as TargetedEvent<typeof event, Document>,
			),
			{ signal: abortSignal },
		)
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function on(target: 'window' | 'document', key: any, handler: any) {
		if (target === 'window') return createWindowEventListener(target, key, handler)
		return createDocumentEventListener(target, key, handler)
	}
	return on as unknown as typeof createWindowEventListener & typeof createDocumentEventListener
}
