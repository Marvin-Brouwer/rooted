import { ElementKeys, TagSpecificEventMap } from './event.mts'

/**
 * @example
 *
 * ```typescript
 * const clickEvent = forwardEvent('button', 'click')
 * ```
 */
export function forwardEvent<
	KElement extends ElementKeys,
	TEvent extends keyof TagSpecificEventMap<KElement>,
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
 * Created via {@link forwardEvent}. Spread the result of
 * `events.forward(def)` into a child element's `events` array.
 *
 * @typeParam KElement - The tag name of the element that originates the event.
 * @typeParam EventKey - The event name key, constrained to events semantically
 *   applicable to that element type (see {@link TagSpecificEventMap}).
 */
export class ForwardedEvent<
	KElement extends ElementKeys,
	EventKey extends keyof TagSpecificEventMap<KElement>,
> {
	constructor(
		readonly tag: KElement,
		readonly key: EventKey,
	) {}
}
