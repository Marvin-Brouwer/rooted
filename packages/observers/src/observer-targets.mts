/**
 * What an observer watches: one target, or any iterable of them.
 *
 * An `Element` isn't iterable and a `NodeList` is, so the result of
 * `querySelectorAll` can be passed straight through without spreading it.
 *
 * @typeParam TTarget - `Element` for intersection and resize, `Node` for mutations.
 *
 * @example
 * ```ts
 * targets: table                          // one
 * targets: [header, footer]               // several
 * targets: list.querySelectorAll('li')    // a NodeList
 * ```
 */
export type ObserverTargets<TTarget> = TTarget | Iterable<TTarget>

/**
 * @internal
 * Normalises {@link ObserverTargets} to something you can `for ... of`.
 */
export function toTargetList<TTarget>(targets: ObserverTargets<TTarget>): Iterable<TTarget> {
	if (typeof targets === 'object' && targets !== null && Symbol.iterator in targets) {
		return targets as Iterable<TTarget>
	}
	return [targets as TTarget]
}
