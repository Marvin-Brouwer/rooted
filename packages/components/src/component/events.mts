declare class SyntheticEventElement<M extends Record<string, Event>> extends Element {
	private declare _m: M
}

export type ElementEventMap<T extends Element> =
	T extends HTMLElement ? HTMLElementEventMap :
	T extends SVGElement ? SVGElementEventMap :
	T extends SyntheticEventElement<infer M> ? M :
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
export type TargetedEvent<TEvent, TTarget extends EventTarget> =
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

const customEventBrand: unique symbol = Symbol('@rooted/customEvent')
const forwardedEventBrand: unique symbol = Symbol('@rooted/forwardedEvent')

/**
 * Describes a custom event that a component can emit.
 *
 * Created via the {@link event} factory. Pass a union of definitions to
 * {@link Events} in the component's options type so that parents can
 * subscribe with typed handlers.
 *
 * @typeParam TDetail - The type carried in `event.detail`.
 * @typeParam TName - The literal event name string.
 */
export type CustomEvent<TDetail, TName extends string> = {
	readonly [customEventBrand]: TDetail
	readonly name: TName
}

/**
 * Describes a native DOM event that a component forwards to its parent.
 *
 * Created via {@link event.forward}. Spread the result of
 * `events.forward(def)` into a child element's `events` array.
 *
 * @typeParam TElement - The element type that originates the event.
 * @typeParam K - The event name key on that element.
 */
export type ForwardedEvent<TElement extends Element, K extends string> = {
	readonly [forwardedEventBrand]: true
	readonly element: abstract new (...args: any[]) => TElement
	readonly key: K
}

type EventDefinition = CustomEvent<any, any> | ForwardedEvent<any, any>

type EventMapEntry<TDef> =
	TDef extends CustomEvent<infer D, infer N> ? { [K in N]: globalThis.CustomEvent<D> } :
	TDef extends ForwardedEvent<infer E, infer K> ? { [P in K]: ElementEventMap<E>[P & keyof ElementEventMap<E>] } :
	never

type UnionToIntersection<U> =
	(U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never

/**
 * The type for the `events` option on a component that exposes custom events.
 *
 * Pass a union of {@link CustomEvent} / {@link ForwardedEvent} definitions as
 * the type argument; the resulting array type is what parents assign to the
 * `events` prop.
 *
 * @example
 * ```ts
 * export type ExampleOptions = {
 *   events?: Events<typeof changeEvent | typeof clickEvent>
 * }
 * ```
 */
export type Events<TDef extends EventDefinition = EventDefinition> =
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Array<EventDescriptor<SyntheticEventElement<UnionToIntersection<EventMapEntry<TDef>> & Record<string, Event>>>>

/**
 * Per-instance event controller returned by {@link eventList}.
 *
 * Provides three operations scoped to the parent descriptors passed at
 * construction time. All operations are safe to call when no parent has
 * registered any listeners — they simply become no-ops or return `[]`.
 */
export interface EventList {
	/**
	 * Returns all parent descriptors whose event name matches the forwarded
	 * event key. Spread into a DOM child element's `events` array to pass a
	 * native event through to the parent.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	forward<TElement extends Element, K extends string>(def: ForwardedEvent<TElement, K>): EventDescriptor<any>[]

	/**
	 * Returns `[descriptor]` when at least one parent handler is registered
	 * for `def`, otherwise `[]`. Use this to skip attaching internal triggers
	 * when nobody is listening.
	 */
	for<TDetail, TName extends string>(
		def: CustomEvent<TDetail, TName>,
		descriptor: EventDescriptor<any>
	): EventDescriptor<any>[]

	/**
	 * Synchronously calls every registered parent handler for `def` with a
	 * newly constructed `CustomEvent`. Per-instance only — no DOM dispatch.
	 *
	 * When `TDetail` is `void`, the `detail` argument may be omitted.
	 */
	emit<TDetail, TName extends string>(
		def: CustomEvent<TDetail, TName>,
		...[detail]: TDetail extends void ? [] : [detail: TDetail]
	): void
}

/**
 * Define a custom event that this component can emit.
 *
 * Two call signatures:
 * - `event('name')` — no detail payload (`TDetail = void`)
 * - `event<number>('name')` — typed detail payload
 *
 * Attach {@link event.forward} to define a forwarded native DOM event.
 *
 * @example
 * ```ts
 * const changeEvent = event<number>('change')
 * const readyEvent  = event('ready')
 * const clickEvent  = event.forward(HTMLButtonElement, 'click')
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const event: {
	<TName extends string>(name: TName): CustomEvent<void, TName>
	<TDetail, TName extends string>(name: TName): CustomEvent<TDetail, TName>
	forward<T extends abstract new (...args: any[]) => Element, K extends string>(
		element: T,
		key: K
	): ForwardedEvent<InstanceType<T>, K>
} = Object.assign(
	function eventFactory(name: string): CustomEvent<any, any> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return { [customEventBrand]: undefined as any, name }
	},
	{
		forward<T extends abstract new (...args: any[]) => Element, K extends string>(
			element: T,
			key: K
		): ForwardedEvent<InstanceType<T>, K> {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return { [forwardedEventBrand]: true, element: element as any, key }
		},
	},
)

/**
 * Create a per-instance {@link EventList} bound to the parent-supplied
 * `descriptors`.
 *
 * Call this at the top of `onMount` and use the returned object to wire up
 * custom-event emission and event forwarding for the component.
 *
 * @param descriptors - The raw array from `options.events` (may be `undefined`
 *   when the parent does not pass any event handlers).
 *
 * @example
 * ```ts
 * const events = eventList(options.events)
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function eventList(descriptors?: EventDescriptor<any>[]): EventList {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const list: EventDescriptor<any>[] = descriptors ?? []
	return {
		forward(def) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return list.filter(d => d.type === def.key) as EventDescriptor<any, any>[]
		},
		for(def, descriptor) {
			return list.some(d => d.type === def.name) ? [descriptor] : []
		},
		emit(def, ...args) {
			const detail = args[0]
			const e = new globalThis.CustomEvent(def.name, { detail, bubbles: true })
			for (const d of list) {
				if (d.type === def.name && !d.signal.aborted) d.handler(e as any) // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
			}
		},
	}
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
