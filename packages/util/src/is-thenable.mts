/**
 * Returns `true` when `value` has a callable `then`, which is what `await`
 * itself treats as a promise.
 *
 * Duck-typing rather than `instanceof Promise` on purpose: a thenable from
 * another library, or a polyfilled promise, behaves the same everywhere it
 * matters. The cost is that plain data carrying a `then` method counts as a
 * promise here too.
 *
 * @example
 * ```ts
 * // Take either a value or a promise for one, without two code paths.
 * const created = factory()
 * if (!isThenable(created)) return new Store(created)
 * return Promise.resolve(created).then((state) => new Store(state))
 * ```
 */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
	return typeof (value as PromiseLike<unknown> | undefined)?.then === 'function'
}
