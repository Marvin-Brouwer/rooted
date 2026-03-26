import { ElementEventMap, ElementKeys, ElementMap } from './event.mts'

/**
 * @example
 *
 * ```typescript
 * const clickEvent = forwardEvent('button', 'click')
 * ```
 */
export function forwardEvent<
	KElement extends ElementKeys,
	TEvent extends keyof ElementEventMap<ElementMap<KElement>>,
>(
	tag: KElement, eventName: TEvent,
): ForwardedEvent<KElement, TEvent> {
	return new ForwardedEvent(
		tag,
		eventName,
	)
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
export class ForwardedEvent<
	KElement extends ElementKeys,
	EventKey extends keyof ElementEventMap<ElementMap<KElement>>,
> {
	constructor(
		readonly tag: KElement,
		readonly key: EventKey,
	) {}
}

// @clause the type maps are incomplete, I want it to work like this
// // Should be okay
// const test = forwardEvent('button', 'click')
// const test2 = forwardEvent('input', 'change')
// // should be invalid, button does not have an onchange event
// const test3 = forwardEvent('button', 'change')
