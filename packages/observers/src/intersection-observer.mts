import { connectObserver } from './connect-observer.mts'
import { type ObserverHandler, toObserverCallback } from './observer-handler.mts'
import { type ObserverTargets } from './observer-targets.mts'

/**
 * Everything {@link intersectionObserver} takes. The `root`, `rootMargin` and
 * `threshold` keys are the browser's own `IntersectionObserverInit`, passed
 * straight through to the constructor.
 */
export type IntersectionObserverProperties = IntersectionObserverInit & {
	/** One element, or any iterable of them. Each one gets observed. */
	targets: ObserverTargets<Element>
	/** Disconnects the observer when it aborts. Inside a component, pass the component's `signal`. */
	signal: AbortSignal
	on: {
		/** Runs whenever the browser reports a batch of intersection changes. */
		intersect: ObserverHandler<IntersectionObserverEntry, IntersectionObserver>
	}
}

/**
 * An `IntersectionObserver` that disconnects when `signal` aborts.
 *
 * Same observer, same entries, same options. The difference is that you don't
 * write the teardown: no `signal.addEventListener('abort', ...)`, and no
 * separate `observe()` call per target. The observer is returned, so
 * `disconnect()` and `unobserve()` still work the way you'd expect.
 *
 * An already-aborted signal observes nothing.
 *
 * @example
 * ```ts
 * onMount({ signal }) {
 *   intersectionObserver({
 *     targets: table,
 *     rootMargin: '0px 0px -10% 0px',
 *     signal,
 *     on: {
 *       intersect({ entries, observer }) {
 *         if (!entries.some(entry => entry.isIntersecting)) return
 *         observer.disconnect()
 *         reroll()
 *       },
 *     },
 *   })
 * }
 * ```
 */
export function intersectionObserver(properties: IntersectionObserverProperties): IntersectionObserver {
	const { on, signal, targets, ...init } = properties

	return connectObserver(
		new IntersectionObserver(toObserverCallback(on.intersect), init),
		targets,
		signal,
		(observer, target) => observer.observe(target),
	)
}
