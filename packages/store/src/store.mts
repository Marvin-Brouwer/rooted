import { deepClone, deepFreeze } from './deepClone.mts'
import { hashState } from './hash.mts'

type StoreEventDetail<TState> = { state: Readonly<TState> }

export type StoreEvent<TState> = CustomEvent<StoreEventDetail<TState>>

/**
 * The set of value types a {@link Store} may hold.
 * Covers all common serialisable primitives, objects, dates, arrays thereof,
 * and `undefined` (for stores created without an initial value).
 */
export type StateType = Date | string | boolean | number | bigint | object | undefined | null

type SetterResult<TState> = TState extends object ? Partial<TState> | void : TState | void

/**
 * A synchronous shared state container for inter-component communication.
 *
 * Dispatches two event types that mirror native `input` and `change`:
 * - `'update'` fires on every {@link Store.update} call.
 * - `'change'` fires only when the state hash differs from the previous value.
 */
export type Store<TState extends StateType | Array<StateType>> = {
	/**
	 * A frozen snapshot of the current state.
	 *
	 * Computed lazily on first read after an `update` and cached until the next
	 * `update`, so `store.value === store.value` between updates. Useful for
	 * downstream memoisation.
	 */
	readonly value: Readonly<TState>
	/**
	 * Updates the store state synchronously.
	 *
	 * The setter receives the **live** state reference (not a clone). You can
	 * mutate it at any depth directly: `s.pad.aces = score` works.
	 *
	 * - For **object** state: return `void` to keep your mutations as-is, or
	 *   return a `Partial<TState>` to merge specific keys on top of the current
	 *   state.
	 * - For **primitive** state: return the new value.
	 *
	 * Calling `update` invalidates the cached snapshot, so the next `value` read
	 * reflects the new state.
	 */
	update(setter: (currentValue: TState) => SetterResult<TState>): void
	/**
	 * Subscribes to `'update'` events, which fire on **every** call to
	 * {@link Store.update} regardless of whether the state changed.
	 *
	 * The `signal` is required and controls listener lifetime. Pass the
	 * component's `signal` to ensure cleanup on unmount.
	 */
	on(event: 'update', signal: AbortSignal, handler: (event: StoreEvent<TState>) => void): void
	/**
	 * Subscribes to `'change'` events, which fire only when the **state hash
	 * differs** from the previous value (structural change detected).
	 *
	 * The `signal` is required and controls listener lifetime. Pass the
	 * component's `signal` to ensure cleanup on unmount.
	 */
	on(event: 'change', signal: AbortSignal, handler: (event: StoreEvent<TState>) => void): void
}

class StoreImpl<TState extends StateType | Array<StateType>> extends EventTarget implements Store<TState> {
	#state: TState
	#hash: string
	#isObject: boolean
	#snapshot: Readonly<TState> | undefined

	constructor(initial: TState) {
		super()
		this.#state = initial
		this.#hash = hashState(initial)
		// eslint-disable-next-line unicorn/no-null
		this.#isObject = typeof initial === 'object' && initial !== null
	}

	get value(): Readonly<TState> {
		if (!this.#isObject) return this.#state as Readonly<TState>
		return this.#snapshot ??= deepFreeze(deepClone(this.#state)) as Readonly<TState>
	}

	update(setter: (currentValue: TState) => SetterResult<TState>): void {
		const result = setter(this.#state)

		if (result !== undefined) {
			this.#state = this.#isObject
				? Object.assign({}, this.#state as object, result) as TState
				: result as TState
		}
		this.#snapshot = undefined

		const frozenState = this.value
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
 * Primitive values are widened to their base type. `createStore(true)` returns
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
 * // Primitive state. Widened automatically.
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
	return new StoreImpl(initial)
}
