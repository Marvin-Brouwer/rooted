import { CustomEvent } from './custom-event.mts'
import { DeferredEventDescriptor, ElementEventMap, ElementKeys, ElementMap, EventDefinition, EventDescriptor, TagSpecificEventMap } from './event.mts'
import { ForwardedEvent } from './forwarded-event.mts'

// TODO explain usage

type ArrayElement<T> = T extends readonly (infer U)[] ? U : T

export type EventHelper = ReturnType<typeof createEventHelper>
export function createEventHelper(eventTarget: EventTarget, abortSignal: AbortSignal) {
	function events<T extends EventDefinition>(events: T): EventsHelper<ArrayElement<T>>
	function events<T extends Array<EventDefinition>>(events: T): EventsHelper<ArrayElement<T>>
	function events<T extends EventDefinition | Array<EventDefinition>>(optionEvents: T): EventsHelper<ArrayElement<T>> {
		return new EventsHelper<EventDefinition>(
			Array.isArray(optionEvents)
				? optionEvents
				: [optionEvents],
			abortSignal,
			eventTarget,
		) as unknown as EventsHelper<ArrayElement<T>>
	}

	return events
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDescriptor = EventDescriptor<any> | DeferredEventDescriptor<any, any>

export class EventsHelper<T extends EventDefinition> {
	constructor(
		private readonly events: Array<T>,
		private readonly abortSignal: AbortSignal,
		private readonly eventTarget: EventTarget,
	) {}

	/**
	 * Returns all parent descriptors whose event name matches the forwarded
	 * event key. Spread into a DOM child element's `events` array to pass a
	 * native event through to the parent.
	 *
	 * @example
	 * ```typescript
	 * ...options.events.forward(clickEvent)
	 * ```
	 */
	forward<KElement extends ElementKeys, EventKey extends keyof TagSpecificEventMap<KElement>>(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		forwardedEvent: ForwardedEvent<KElement, EventKey>): (EventDescriptor<ElementMap<KElement>> | DeferredEventDescriptor<any, any>)[] {
		return (this.events as AnyDescriptor[])
			.filter((d): d is AnyDescriptor => d instanceof EventDescriptor || d instanceof DeferredEventDescriptor)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.filter(d => d.key === forwardedEvent.key) as any
	}

	/**
	 * @example
	 * ```typescript
	 * options.events.for(changeEvent, on('click', () => events.emit(changeEvent, 99)))
	 * ```
	 */
	for<KElement extends ElementKeys, EventKey extends keyof ElementEventMap<ElementMap<KElement>>>(
		definition: CustomEvent,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		descriptor: EventDescriptor<ElementMap<KElement>, EventKey> | DeferredEventDescriptor<any, any>,
	): typeof descriptor | undefined {
		const matchingListeners = (this.events as AnyDescriptor[])
			.filter((d): d is AnyDescriptor => d instanceof EventDescriptor || d instanceof DeferredEventDescriptor)
			.filter(d => d.key === definition.type)

		if (matchingListeners.length === 0) return undefined

		// Wire parent handlers on the component element so emit()'s dispatchEvent
		// reaches them without polluting the inner element's events array.
		for (const listener of matchingListeners) {
			this.eventTarget.addEventListener(
				definition.type,
				listener.handler as unknown as EventListener,
				{ signal: this.abortSignal },
			)
		}

		return descriptor
	}

	emit(
		definition: CustomEvent<never>
	): void
	emit<TDetail extends object>(
		definition: CustomEvent<TDetail>,
		detail: TDetail
	): void
	emit<TDetail extends object>(
		definition: CustomEvent<TDetail>,
		...[detail]: TDetail extends void ? [] : [detail: TDetail]
	): void {
		if (this.abortSignal.aborted) return

		this.eventTarget.dispatchEvent(
			new globalThis.CustomEvent(definition.type, {
				bubbles: definition.bubbles,
				cancelable: definition.cancelable,
				composed: definition.composed,
				detail: detail,
			}),
		)
	}
}
