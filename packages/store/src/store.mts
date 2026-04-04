import { hashState } from './hash.mts'

type StoreEventDetail<TState> = { state: Readonly<TState> }

export type StoreEvent<TState extends object> = CustomEvent<StoreEventDetail<TState>>

/**
 * A synchronous shared state container for inter-component communication.
 *
 * Dispatches two event types that mirror native `input`/`change` semantics:
 * - `'update'` — fires on every {@link Store.update} call
 * - `'change'` — fires only when the state hash differs from the previous value
 */
export type Store<TState extends object> = {
	/** A frozen snapshot of the current state. */
	readonly value: Readonly<TState>
	/**
	 * Updates the store state synchronously.
	 *
	 * The setter receives a {@link https://developer.mozilla.org/docs/Web/API/structuredClone structuredClone}
	 * of the current state. Returning a `Partial<TState>` merges it into the
	 * current state; returning `void` applies the mutated clone as-is.
	 */
	update(setter: (currentValue: TState) => Partial<TState> | void): void
	/**
	 * Subscribes to store events. The `signal` is required and controls listener
	 * lifetime — pass the component's `signal` to ensure cleanup on unmount.
	 *
	 * - `'update'` fires on every call to {@link Store.update}
	 * - `'change'` fires only when the state hash differs (structural change)
	 */
	on(event: 'change' | 'update', signal: AbortSignal, handler: (event: StoreEvent<TState>) => void): void
}

class StoreImpl<TState extends object> extends EventTarget implements Store<TState> {
	#state: TState
	#hash: string

	constructor(initial: TState) {
		super()
		this.#state = structuredClone(initial)
		this.#hash = hashState(this.#state)
	}

	get value(): Readonly<TState> {
		return Object.freeze(structuredClone(this.#state))
	}

	update(setter: (currentValue: TState) => Partial<TState> | void): void {
		const draft = structuredClone(this.#state)
		const result = setter(draft)

		this.#state = result != null
			? Object.assign(structuredClone(this.#state), result)
			: draft

		const frozenState = Object.freeze(structuredClone(this.#state))
		this.dispatchEvent(new CustomEvent<StoreEventDetail<TState>>('update', { detail: { state: frozenState } }))

		const newHash = hashState(this.#state)
		if (newHash !== this.#hash) {
			this.#hash = newHash
			this.dispatchEvent(new CustomEvent<StoreEventDetail<TState>>('change', { detail: { state: frozenState } }))
		}
	}

	on(event: 'change' | 'update', signal: AbortSignal, handler: (event: StoreEvent<TState>) => void): void {
		this.addEventListener(
			event,
			handler as EventListener,
			{ signal },
		)
	}
}

/**
 * Creates a new {@link Store} with the given initial state.
 *
 * @example
 * ```ts
 * const progress = createStore({ done: false })
 *
 * // Writer component
 * progress.update(s => { s.done = true })
 *
 * // Reader component
 * progress.on('change', signal, ({ detail }) => {
 *   if (detail.state.done) markComplete()
 * })
 * ```
 */
export function createStore<TState extends object>(initial: TState): Store<TState> {
	return new StoreImpl(initial)
}
