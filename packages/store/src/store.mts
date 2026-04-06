import { hashState } from './hash.mts'

type StoreEventDetail<TState> = { state: Readonly<TState> }

export type StoreEvent<TState> = CustomEvent<StoreEventDetail<TState>>

/**
 * The set of value types a {@link Store} may hold.
 * Covers all common serialisable primitives, objects, dates, arrays thereof,
 * and `undefined` (for stores created without an initial value).
 */
export type StateType = Date | string | boolean | number | bigint | object | undefined

type SetterResult<TState> = TState extends object ? Partial<TState> | void : TState | void

/**
 * A synchronous shared state container for inter-component communication.
 *
 * Dispatches two event types that mirror native `input`/`change` semantics:
 * - `'update'` — fires on every {@link Store.update} call
 * - `'change'` — fires only when the state hash differs from the previous value
 */
export type Store<TState extends StateType | Array<StateType>> = {
	/** A frozen snapshot of the current state. */
	readonly value: Readonly<TState>
	/**
	 * Updates the store state synchronously.
	 *
	 * The setter receives a {@link https://developer.mozilla.org/docs/Web/API/structuredClone structuredClone}
	 * of the current state (`currentValue`).
	 *
	 * - For **object** state: return `void` to apply mutations to the clone, or return a
	 *   `Partial<TState>` to merge specific keys into the current state.
	 * - For **primitive** state: return the new value.
	 */
	update(setter: (currentValue: TState) => SetterResult<TState>): void
	/**
	 * Subscribes to `'update'` events, which fire on **every** call to
	 * {@link Store.update} regardless of whether the state changed.
	 *
	 * The `signal` is required and controls listener lifetime — pass the
	 * component's `signal` to ensure cleanup on unmount.
	 */
	on(event: 'update', signal: AbortSignal, handler: (event: StoreEvent<TState>) => void): void
	/**
	 * Subscribes to `'change'` events, which fire only when the **state hash
	 * differs** from the previous value (structural change detected).
	 *
	 * The `signal` is required and controls listener lifetime — pass the
	 * component's `signal` to ensure cleanup on unmount.
	 */
	on(event: 'change', signal: AbortSignal, handler: (event: StoreEvent<TState>) => void): void
}

class StoreImpl<TState extends StateType | Array<StateType>> extends EventTarget implements Store<TState> {
	#state: TState
	#hash: string
	#isObject: boolean

	constructor(initial: TState) {
		super()
		this.#state = this.#clone(initial)
		this.#hash = hashState(this.#state)
		this.#isObject = typeof initial === 'object' && initial !== null
	}

	// structuredClone throws on undefined — guard here so the rest of the class stays clean
	#clone(value: TState): TState {
		if (value === undefined) return undefined as TState
		return structuredClone(value)
	}

	get value(): Readonly<TState> {
		const cloned = this.#clone(this.#state)
		return this.#isObject
			? Object.freeze(cloned) as Readonly<TState>
			: cloned as Readonly<TState>
	}

	update(setter: (currentValue: TState) => SetterResult<TState>): void {
		const draft = this.#clone(this.#state)
		const result = setter(draft)

		if (result === undefined) {
			this.#state = draft
		}
		else if (this.#isObject) {
			this.#state = Object.assign(this.#clone(this.#state) as object, result as Partial<TState>) as TState
		}
		else {
			this.#state = result as TState
		}

		const frozenState = this.#isObject
			? Object.freeze(this.#clone(this.#state)) as Readonly<TState>
			: this.#state as Readonly<TState>

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
 * Primitive values are widened to their base type — `createStore(true)` returns
 * `Store<boolean>`, not `Store<true>`. Use an explicit type parameter to narrow
 * further: `createStore<'idle' | 'navigating'>('idle')`.
 *
 * Calling without an argument creates a store with `undefined` as the initial
 * value. The type parameter is required in this form: `createStore<string>()`.
 *
 * @example
 * ```ts
 * // No initial value
 * const store = createStore<string>()          // Store<string | undefined>
 *
 * // Primitive state — widened automatically
 * const flag = createStore(true)               // Store<boolean>
 * const nav = createStore<'idle' | 'navigating'>('idle')  // Store<'idle' | 'navigating'>
 *
 * // Object state
 * const counter = createStore({ count: 0 })
 * counter.update(s => { s.count++ })
 * counter.on('change', signal, ({ detail }) => render(detail.state))
 * ```
 */
export function createStore<T extends StateType | Array<StateType>>(): Store<T | undefined>
export function createStore(initial: boolean): Store<boolean>
export function createStore(initial: number): Store<number>
export function createStore(initial: string): Store<string>
export function createStore(initial: bigint): Store<bigint>
export function createStore<T extends StateType | Array<StateType>>(initial: T): Store<T>
export function createStore<T extends StateType | Array<StateType>>(initial?: T): Store<T | undefined> {
	return new StoreImpl(initial) as Store<T | undefined>
}
