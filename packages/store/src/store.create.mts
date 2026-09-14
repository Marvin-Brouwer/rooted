import { type StateType, type Store, StoreImpl } from './store.mts'

function isThenable(value: unknown): value is PromiseLike<unknown> {
	return typeof (value as PromiseLike<unknown> | undefined)?.then === 'function'
}

/**
 * The factory form of `createStore`, reachable as `createStore.from`.
 *
 * Takes a factory instead of a value. It runs once, while the store is being built, so nothing is read until the store actually exists. That saves the named helper that exists only to be called on the line above, and it keeps the read out of module-parse time.
 *
 * An async factory hands back a promise for the store rather than the store, so `await` it. There's no half-built store in between. At module scope that means a top-level `await`, which makes the whole module async for everyone importing it, so a synchronous factory with a sensible default is usually the easier thing to live with.
 *
 * Primitive values are widened to their base type, the same as `createStore`.
 *
 * One wrinkle worth knowing: an explicit type parameter and an async factory don't combine. `createStore.from<Theme>(async () => 'dark')` doesn't compile, because the synchronous signature is tried first and widens the literal before the async one gets a look. Annotate the factory's return type instead, which is what you'd write anyway: `createStore.from(async (): Promise<Theme> => 'dark')`.
 *
 * @example
 * ```ts
 * // Read from storage, once, when the store is built.
 * export const theme = createStore.from(() => cookieStorage.get<Theme>('theme') ?? 'light')
 *
 * // Narrow past the widening with an explicit type parameter.
 * const nav = createStore.from<'idle' | 'navigating'>(() => 'idle')
 *
 * // Async factories give you a promise for the store.
 * const settings = await createStore.from(async () => {
 *   const response = await fetch('/settings')
 *   return await response.json() as Settings
 * })
 * ```
 */
export type StoreFactory = {
	(factory: () => boolean): Store<boolean>
	(factory: () => number): Store<number>
	(factory: () => string): Store<string>
	(factory: () => bigint): Store<bigint>
	<T extends StateType | Array<StateType>>(factory: () => T): Store<T>
	<T extends StateType | Array<StateType>>(factory: () => PromiseLike<T>): Promise<Store<T>>
}

// The cast is the same widening any overload implementation does; `StoreFactory` above is the checked contract. Writing it as a typed const rather than an overloaded function declaration is what puts those signatures in the generated API report, where they're the only thing guarding them.
const createStoreFrom = (<T extends StateType | Array<StateType>>(
	factory: () => T | PromiseLike<T>,
): Promise<Store<T>> | Store<T> => {
	const created = factory()
	if (!isThenable(created)) return new StoreImpl(created)

	return Promise.resolve(created).then((state) => new StoreImpl(state as T))
}) as StoreFactory

/**
 * Creates a new {@link Store} with the given initial state.
 *
 * Primitive values are widened to their base type. `createStore(true)` returns `Store<boolean>`, not `Store<true>`. Use an explicit type parameter to narrow further: `createStore<'idle' | 'navigating'>('idle')`.
 *
 * Calling without an argument creates a store with `undefined` as the initial value. The type parameter is required in this form: `createStore<string>()`.
 *
 * State has to be concrete. A bare function is a factory and a promise is something to await, so neither is accepted here: use `createStore.from` for both. Either one nested on a property of object state is fine.
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
 *
 * // State that has to be read first belongs on `from`.
 * const servings = createStore.from(() => localStorage.get<number>(key) ?? 4)
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

createStore.from = createStoreFrom
