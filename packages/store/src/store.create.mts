import { type StateType, type Store, StoreImpl } from './store.mts'

/**
 * Starts a store with exactly this value.
 */
export type StoreValueInit<TState extends StateType | Array<StateType>> = { value: TState, create?: never }

/**
 * Starts a store with whatever `create` returns. It's called once, while the store is being built.
 */
export type StoreFactoryInit<TState extends StateType | Array<StateType>> = { create: () => TState, value?: never }

/**
 * The argument to `createStore`: either `{ value }` or `{ create() }`, never both.
 *
 * It's a shape rather than a bare value so the two stay apart. `StateType` includes `object`, so a plain factory argument would be ambiguous for anyone whose state is itself a function.
 */
export type StoreInit<TState extends StateType | Array<StateType>> = StoreFactoryInit<TState> | StoreValueInit<TState>

/**
 * What `createStore` gives you for a {@link StoreFactoryInit}: the store, or a promise for it when the factory is async.
 */
export type CreatedStore<TState> =
	// Wrapped in a tuple so a union state type stays one store instead of distributing into a union of stores.
	[TState] extends [PromiseLike<infer TResolved extends StateType | Array<StateType>>]
		? Promise<Store<TResolved>>
		: [TState] extends [StateType | Array<StateType>] ? Store<TState> : never

function isThenable(value: unknown): value is PromiseLike<unknown> {
	return typeof (value as PromiseLike<unknown> | undefined)?.then === 'function'
}

/**
 * Creates a new {@link Store}.
 *
 * Takes `{ value }` for state you already have, or `{ create() }` for state that has to be read from somewhere. `create` runs once, while the store is being built, and never again. Nothing runs before that, so a store you never create costs nothing.
 *
 * Primitive values are widened to their base type. `createStore({ value: true })` returns `Store<boolean>`, not `Store<true>`. Use an explicit type parameter to narrow further: `createStore<'idle' | 'navigating'>({ value: 'idle' })`.
 *
 * Calling without an argument creates a store with `undefined` as the initial value. The type parameter is required in this form: `createStore<string>()`.
 *
 * An `async create` gives you a promise for the store instead of the store. The flip side is that a factory can't produce a store whose state *is* a promise, because anything thenable it returns gets awaited. `{ value: promise }` does hold the promise, but it isn't much of a workaround: object state is deep-cloned for snapshots and a cloned promise doesn't work. A store of a promise isn't really a thing here.
 *
 * Passing both `value` and `create` doesn't compile. Passing a bare value throws a `TypeError`, which is there for JavaScript callers and for anyone migrating from the version that took one.
 *
 * @example
 * ```ts
 * // No initial value
 * const store = createStore<string>()                      // Store<string | undefined>
 *
 * // Primitive state. Widened automatically.
 * const flag = createStore({ value: true })                // Store<boolean>
 * const nav = createStore<'idle' | 'navigating'>({ value: 'idle' })
 *
 * // Object state
 * const counter = createStore({ value: { count: 0 } })
 * counter.update(s => { s.count++ })
 * counter.on('change', signal, ({ detail }) => render(detail.state))
 *
 * // Read from storage, once, when the store is built.
 * const servings = createStore({ create: () => localStorage.get<number>(key) ?? 4 })
 *
 * // An async factory hands back a promise for the store.
 * const session = await createStore({ async create() { return fetchSession() } })
 * ```
 */
export function createStore<T extends StateType | Array<StateType>>(): Store<T | undefined>
export function createStore(init: StoreInit<boolean>): Store<boolean>
export function createStore(init: StoreInit<number>): Store<number>
export function createStore(init: StoreInit<string>): Store<string>
export function createStore(init: StoreInit<bigint>): Store<bigint>
export function createStore<T extends StateType | Array<StateType>>(init: StoreFactoryInit<T>): CreatedStore<T>
export function createStore<T extends StateType | Array<StateType>>(init: StoreFactoryInit<Promise<T>>): Promise<Store<T>>
export function createStore<T extends StateType | Array<StateType>>(init: StoreValueInit<T>): Store<T>
export function createStore<T extends StateType | Array<StateType>>(
	init?: StoreInit<T>,
): Promise<Store<T | undefined>> | Store<T | undefined> {
	if (init === undefined) return new StoreImpl<T | undefined>(undefined)
	// eslint-disable-next-line unicorn/no-null
	if (typeof init !== 'object' || init === null) {
		throw new TypeError('createStore takes { value } or { create() }, not a bare value')
	}
	// Read `create` by type, not with `in`, so a spread that leaves it undefined falls through to `value`.
	if (typeof init.create !== 'function') return new StoreImpl<T | undefined>(init.value as T)

	const created = init.create()
	if (!isThenable(created)) return new StoreImpl<T | undefined>(created)

	return Promise.resolve(created).then(value => new StoreImpl<T | undefined>(value as T))
}
