/**
 * A handler passed in the `on` map of {@link intersectionObserver}, {@link mutationObserver} or {@link resizeObserver}.
 *
 * It gets the batch the browser handed to the observer,
 * plus the observer itself so you can call `disconnect()` or `unobserve()` from inside.
 * The handler may also take no arguments at all, for the cases where you only care that something happened.
 *
 * Async handlers are allowed and are not awaited:
 * the browser doesn't wait for an observer callback, so neither do we.
 * If your handler can reject, catch it yourself.
 *
 * The batch is always called `entries`, including for `MutationObserver`, where the DOM calls them records.
 * One name across the three wrappers was worth more than matching the platform on one of them.
 *
 * @typeParam TEntry - What the browser puts in the batch, e.g. `IntersectionObserverEntry`.
 * @typeParam TObserver - The observer type, e.g. `IntersectionObserver`.
 *
 * @example
 * ```ts
 * // In an options type of your own:
 * type LazyImageOptions = {
 *   on?: { intersect?: ObserverHandler<IntersectionObserverEntry, IntersectionObserver> }
 * }
 * ```
 */
export type ObserverHandler<TEntry, TObserver>
	= ((event: { entries: TEntry[], observer: TObserver }) => void | Promise<void>)
		| (() => void | Promise<void>)

/**
 * @internal
 * Adapts an {@link ObserverHandler} to the `(entries, observer)` callback the DOM observer constructors take.
 * The result is fire and forget, the same as the event listeners in `@rooted/events`.
 */
export function toObserverCallback<TEntry, TObserver>(
	handler: ObserverHandler<TEntry, TObserver>,
): (entries: TEntry[], observer: TObserver) => void {
	return (entries, observer) => void (
		handler as (event?: { entries: TEntry[], observer: TObserver }) => void | Promise<void>
	)({ entries, observer })
}
