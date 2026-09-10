import { deepClone, deepFreeze } from './deepClone.mts'
import { hashState } from './hash.mts'
import { storeAbortSignal } from './store-abort-signal.mts'

type StoreEventDetail<TState> = { state: ReadonlyState<TState> }

export type StoreEvent<TState> = CustomEvent<StoreEventDetail<TState>>

/**
 * Handler passed to {@link Store.on}. Gets the dispatched event; the new state sits on `event.detail.state`.
 */
export type StoreEventHandler<TState> = (event: StoreEvent<TState>) => void

/**
 * The set of value types a {@link Store} may hold. Covers all common serialisable primitives, objects, dates, arrays thereof, and `undefined` (for stores created without an initial value).
 */
export type StateType = Date | string | boolean | number | bigint | object | undefined | null

/**
 * A recursively-readonly view of a state value.
 *
 * Marks every nested object, array, tuple, `Map`, `Set`, `Date`, `RegExp`, and `Error` as readonly. Stops at functions (there's no meaningful "readonly function") and primitives.
 */
export type ReadonlyState<T> =
	T extends (...arguments_: never) => unknown ? T :
		T extends Date | RegExp | Error ? Readonly<T> :
			T extends Map<infer K, infer V> ? ReadonlyMap<ReadonlyState<K>, ReadonlyState<V>> :
				T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<ReadonlyState<K>, ReadonlyState<V>> :
					T extends Set<infer V> ? ReadonlySet<ReadonlyState<V>> :
						T extends ReadonlySet<infer V> ? ReadonlySet<ReadonlyState<V>> :
							T extends ReadonlyArray<infer V>
								? number extends T['length']
									? ReadonlyArray<ReadonlyState<V>>
									: { readonly [K in keyof T]: ReadonlyState<T[K]> }
								: T extends object ? { readonly [K in keyof T]: ReadonlyState<T[K]> }
									: T

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
	 * Computed lazily on first read after an `update` and cached until the next `update`, so `store.value === store.value` between updates. Useful for downstream memoisation.
	 */
	readonly value: ReadonlyState<TState>
	/**
	 * Updates the store state synchronously.
	 *
	 * The setter receives the **live** state reference (not a clone). You can mutate it at any depth directly: `s.pad.aces = score` works.
	 *
	 * - For **object** state: return `void` to keep your mutations as-is, or return a `Partial<TState>` to merge specific keys on top of the current state.
	 * - For **primitive** state: return the new value.
	 *
	 * Calling `update` invalidates the cached snapshot, so the next `value` read reflects the new state.
	 */
	update(setter: (currentValue: TState) => SetterResult<TState>): void
	/**
	 * Subscribes to `'update'` events, which fire on **every** call to {@link Store.update} regardless of whether the state changed.
	 *
	 * The `signal` controls listener lifetime. Inside a component, pass the component's `signal` so the listener is cleaned up on unmount.
	 */
	on(event: 'update', signal: AbortSignal, handler: StoreEventHandler<TState>): void
	/**
	 * Subscribes to `'update'` events for as long as the store itself lives.
	 *
	 * Use this at module scope, where there's no unmount to hang cleanup off. The listener is cleaned up when the page unloads instead. Inside a component, use the overload that takes the component's `signal` instead.
	 */
	on(event: 'update', handler: StoreEventHandler<TState>): void
	/**
	 * Subscribes to `'change'` events, which fire only when the **state hash differs** from the previous value (structural change detected).
	 *
	 * The `signal` controls listener lifetime. Inside a component, pass the component's `signal` so the listener is cleaned up on unmount.
	 */
	on(event: 'change', signal: AbortSignal, handler: StoreEventHandler<TState>): void
	/**
	 * Subscribes to `'change'` events for as long as the store itself lives.
	 *
	 * Use this at module scope, where there's no unmount to hang cleanup off. The listener is cleaned up when the page unloads instead. Inside a component, use the overload that takes the component's `signal` instead.
	 */
	on(event: 'change', handler: StoreEventHandler<TState>): void
}

class StoreImpl<TState extends StateType | Array<StateType>> extends EventTarget implements Store<TState> {
	#state: TState
	#hash: string
	#snapshot: ReadonlyState<TState> | undefined

	constructor(initial: TState) {
		super()
		this.#state = initial
		this.#hash = hashState(initial)
	}

	get #holdsObject(): boolean {
		// eslint-disable-next-line unicorn/no-null
		return typeof this.#state === 'object' && this.#state !== null
	}

	get value(): ReadonlyState<TState> {
		if (!this.#holdsObject) return this.#state as ReadonlyState<TState>
		return this.#snapshot ??= deepFreeze(deepClone(this.#state)) as ReadonlyState<TState>
	}

	update(setter: (currentValue: TState) => SetterResult<TState>): void {
		const result = setter(this.#state)

		if (result !== undefined) {
			this.#state = this.#holdsObject
				? Object.assign({}, this.#state as object, result) as TState
				: result as TState
		}
		this.#snapshot = undefined

		this.dispatchEvent(new CustomEvent<StoreEventDetail<TState>>('update', { detail: { state: this.value } }))

		const newHash = hashState(this.#state)
		if (newHash !== this.#hash) {
			this.#hash = newHash
			this.dispatchEvent(new CustomEvent<StoreEventDetail<TState>>('change', { detail: { state: this.value } }))
		}
	}

	/** Subscribes to `'change'` until the page unloads. */
	on(event: 'change', handler: StoreEventHandler<TState>): void
	/** Subscribes to `'change'` until `signal` aborts. */
	on(event: 'change', signal: AbortSignal, handler: StoreEventHandler<TState>): void
	/** Subscribes to `'update'` until the page unloads. */
	on(event: 'update', handler: StoreEventHandler<TState>): void
	/** Subscribes to `'update'` until `signal` aborts. */
	on(event: 'update', signal: AbortSignal, handler: StoreEventHandler<TState>): void
	on(
		event: 'change' | 'update',
		signalOrHandler: AbortSignal | StoreEventHandler<TState>,
		handler?: StoreEventHandler<TState>,
	): void {
		if (typeof signalOrHandler === 'function') {
			this.addEventListener(event, signalOrHandler as EventListener, { signal: storeAbortSignal })
			return
		}

		this.addEventListener(
			event,
			handler as EventListener,
			{ signal: signalOrHandler },
		)
	}
}

/**
 * Creates a new {@link Store} with the given initial state.
 *
 * Primitive values are widened to their base type. `createStore(true)` returns `Store<boolean>`, not `Store<true>`. Use an explicit type parameter to narrow further: `createStore<'idle' | 'navigating'>('idle')`.
 *
 * Calling without an argument creates a store with `undefined` as the initial value. The type parameter is required in this form: `createStore<string>()`.
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
 *
 * // At module scope there's no signal to pass. Leave it out and it's cleaned up on page unload.
 * counter.on('change', ({ detail }) => localStorage.setItem('count', String(detail.state.count)))
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
