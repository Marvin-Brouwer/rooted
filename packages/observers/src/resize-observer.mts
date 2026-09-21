import { connectObserver } from './connect-observer.mts'
import { type ObserverHandler, toObserverCallback } from './observer-handler.mts'
import { type ObserverTargets } from './observer-targets.mts'

/**
 * Everything {@link resizeObserver} takes.
 * The `box` key is the browser's own `ResizeObserverOptions`, passed straight through to `observe()`.
 */
export type ResizeObserverProperties = ResizeObserverOptions & {
	/** One element, or any iterable of them. Each one gets observed with the same box. */
	targets: ObserverTargets<Element>
	/** Disconnects the observer when it aborts. Inside a component, pass the component's `signal`. */
	signal: AbortSignal
	on: {
		/** Runs whenever the browser reports a batch of size changes. */
		resize: ObserverHandler<ResizeObserverEntry, ResizeObserver>
	}
}

/**
 * A `ResizeObserver` that disconnects when `signal` aborts.
 *
 * `ResizeObserver` takes its `box` on `observe()` rather than on the constructor,
 * so every target here is observed with the same box.
 *
 * An already-aborted signal observes nothing.
 *
 * @example
 * ```ts
 * onMount({ signal }) {
 *   resizeObserver({
 *     targets: row,
 *     signal,
 *     on: {
 *       resize({ entries }) {
 *         for (const entry of entries) reposition(entry.target, entry.contentRect)
 *       },
 *     },
 *   })
 * }
 * ```
 */
export function resizeObserver(properties: ResizeObserverProperties): ResizeObserver {
	const { on, signal, targets, ...options } = properties

	return connectObserver(
		new ResizeObserver(toObserverCallback(on.resize)),
		targets,
		signal,
		(observer, target) => observer.observe(target, options),
	)
}
