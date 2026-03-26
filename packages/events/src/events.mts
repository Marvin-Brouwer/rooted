import { CustomEvent } from './custom-event.mts'
import { ElementEventMap, ElementKeys, ElementMap, EventDefinition, EventDescriptor } from './event.mts'
import { ForwardedEvent } from './forwarded-event.mts'

import type { ArrayElement } from '@rooted/util'

// TODO explain usage

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
	forward<KElement extends ElementKeys, EventKey extends keyof ElementEventMap<ElementMap<KElement>>>(
		forwardedEvent: ForwardedEvent<KElement, EventKey>): EventDescriptor<ElementMap<KElement>>[] {
		return this.events
			.filter(d => d instanceof EventDescriptor)
			.filter(d => d.tag === forwardedEvent.tag)
			.filter(d => d.key === forwardedEvent.key)
	}

	/**
	 * @example
	 * ```typescript
	 * options.events.for(changeEvent, on('click', () => events.emit(changeEvent, 99)))
	 * ```
	 */
	for<KElement extends ElementKeys, EventKey extends keyof ElementEventMap<ElementMap<KElement>>>(
		definition: CustomEvent,
		descriptor: EventDescriptor<ElementMap<KElement>, EventKey>,
	): EventDescriptor<ElementMap<KElement>, EventKey> | undefined {
		const containsListener = this.events
			.filter(d => d instanceof CustomEvent)
			.some(d => d.type === definition.type)

		if (!containsListener) return undefined

		// @claude I'd like this to use this.eventTarget.addEventListener somehow
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

		const eventToEmit = new CustomEvent(definition.type, {
			bubbles: definition.bubbles,
			cancelable: definition.cancelable,
			composed: definition.composed,
			detail: detail,
		})

		// @claude I'd like this to use this.eventTarget.emitEvent
		throw new Error('not implemented ' + JSON.stringify([this.eventTarget, eventToEmit]))
	}
}
