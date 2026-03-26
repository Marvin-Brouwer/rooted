export type ElementEventMap<T extends Element> =
	T extends HTMLElement ? HTMLElementEventMap :
	T extends SVGElement ? SVGElementEventMap :
	Record<string, Event>

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
export type TargetedEvent<TEvent extends Event, TTarget extends EventTarget> =
	TEvent & { readonly currentTarget: TTarget }

const eventDescriptorBrand: unique symbol = Symbol('@rooted/eventDescriptor')

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
export type EventDescriptor<
	TElement extends Element,
	K extends keyof ElementEventMap<TElement> = keyof ElementEventMap<TElement>,
> = {
	readonly [eventDescriptorBrand]: true
	readonly type: K
	readonly handler: (event: TargetedEvent<ElementEventMap<TElement>[K], TElement>) => void
	readonly signal: AbortSignal
}

/**
 * One or more {@link EventDescriptor} values accepted by the `events` prop
 * of every element created via `create()` or `append()`.
 *
 * - A single descriptor is applied as-is.
 * - An array of descriptors is iterated in order.
 *
 * @see {@link EventBuilder} for creating descriptors with the `on` helper.
 */
export type ElementEvents<TElement extends Element> =
	Array<EventDescriptor<TElement>> | EventDescriptor<TElement>

/**
 * The type of the `on` helper available on {@link ComponentContext} and
 * returned by {@link createEventBuilder}.
 *
 * Supports four call signatures:
 *
 * - `on(window, type, handler)` — immediately binds to `window`
 * - `on(document, type, handler)` — immediately binds to `document`
 * - `on(Constructor, type, handler)` — deferred; element type inferred from constructor
 * - `on<E>(type, handler)` — deferred; element type from explicit generic or context
 *
 * @example Inside `onMount` (most common)
 * ```ts
 * onMount({ on, create, append }) {
 *   on(window, 'popstate', e => { /* e.currentTarget is Window *\/ })
 *
 *   append(create('button', {
 *     events: [on('click', e => { e.currentTarget.disabled = true })]
 *   }))
 * }
 * ```
 */
export type EventBuilder = {
	/** Immediately bind a listener to `window` using the component signal. */
	<K extends keyof WindowEventMap>(
		target: Window,
		type: K,
		handler: (event: TargetedEvent<WindowEventMap[K], Window>) => void,
	): void

	/** Immediately bind a listener to `document` using the component signal. */
	<K extends keyof DocumentEventMap>(
		target: Document,
		type: K,
		handler: (event: TargetedEvent<DocumentEventMap[K], Document>) => void,
	): void

	/**
	 * Create a deferred {@link EventDescriptor} using the element constructor
	 * as a type token. Useful for pre-defining events before `create()`.
	 *
	 * @example
	 * ```ts
	 * const click = on(HTMLButtonElement, 'click', e => { e.currentTarget.form })
	 * create('button', { events: [click] })
	 * ```
	 */
	<T extends abstract new (...args: any[]) => Element, K extends keyof ElementEventMap<InstanceType<T>>>(
		constructor: T,
		type: K,
		handler: (event: TargetedEvent<ElementEventMap<InstanceType<T>>[K], InstanceType<T>>) => void,
	): EventDescriptor<InstanceType<T>, K>

	/**
	 * Create a deferred {@link EventDescriptor}. The element type `E` is
	 * inferred from the `events` array context or supplied explicitly.
	 *
	 * @example Inline (element type inferred)
	 * ```ts
	 * create('button', {
	 *   events: [on('click', e => { e.currentTarget.disabled = true })]
	 * })
	 * ```
	 *
	 * @example Explicit generic
	 * ```ts
	 * const click = on<HTMLButtonElement>('click', e => { e.clientX })
	 * ```
	 */
	<E extends Element, K extends keyof ElementEventMap<E>>(
		type: K,
		handler: (event: TargetedEvent<ElementEventMap<E>[K], E>) => void,
	): EventDescriptor<E, K>
}

function isGlobalTarget(value: unknown): value is Window | Document {
	return value === window || value === document
}

function isConstructor(value: unknown): value is abstract new (...args: any[]) => Element {
	return typeof value === 'function'
}

/**
 * Creates an {@link EventBuilder} bound to the given `AbortSignal`.
 *
 * This is the factory used internally to create the `on` helper that is
 * exposed via {@link ComponentContext}. It can also be imported from
 * `@rooted/components/elements` for use outside of `onMount` — for example
 * inside a {@link RootedElement} subclass that manages its own signal.
 *
 * @param signal - The `AbortSignal` attached to every event listener created
 *   by the returned builder. Listeners are automatically removed when the
 *   signal aborts.
 *
 * @example Inside a RootedElement subclass
 * ```ts
 * import { RootedElement, createEventBuilder } from '@rooted/components/elements'
 *
 * class MyElement extends RootedElement {
 *   static tagName = 'my-element'
 *   private abortController = new AbortController()
 *   protected onMount() {
 *     const on = createEventBuilder(this.abortController.signal)
 *     on(window, 'resize', () => this.updateLayout())
 *   }
 *   protected onUnmount() {
 *     this.abortController.abort()
 *   }
 * }
 * ```
 */
export function createEventBuilder(signal: AbortSignal): EventBuilder {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return ((...args: any[]): any => {
		if (args.length === 3 && isGlobalTarget(args[0])) {
			// Overload 1 & 2: immediate global binding
			const [target, type, handler] = args as [Window | Document, string, EventListener]
			target.addEventListener(type, handler, { signal })
			return
		}

		if (args.length === 3 && isConstructor(args[0])) {
			// Overload 3: deferred, constructor type-token
			const [, type, handler] = args as [unknown, string, EventListener]
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return { [eventDescriptorBrand]: true, type, handler, signal } as unknown as EventDescriptor<Element>
		}

		// Overload 4: deferred, explicit generic / context inference
		const [type, handler] = args as [string, EventListener]
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return { [eventDescriptorBrand]: true, type, handler, signal } as unknown as EventDescriptor<Element>
	}) as EventBuilder
}
