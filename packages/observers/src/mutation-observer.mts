import { connectObserver } from './connect-observer.mts'
import { type ObserverHandler, toObserverCallback } from './observer-handler.mts'
import { type ObserverTargets } from './observer-targets.mts'

/**
 * Everything {@link mutationObserver} takes. The `childList`, `subtree`,
 * `attributes`, `attributeFilter` and friends are the browser's own
 * `MutationObserverInit`, passed straight through to `observe()`.
 */
export type MutationObserverProperties = MutationObserverInit & {
	/** One node, or any iterable of them. Each one gets observed with the same options. */
	targets: ObserverTargets<Node>
	/** Disconnects the observer when it aborts. Inside a component, pass the component's `signal`. */
	signal: AbortSignal
	on: {
		/** Runs whenever the browser reports a batch of mutations. */
		mutate: ObserverHandler<MutationRecord, MutationObserver>
	}
}

/**
 * A `MutationObserver` that disconnects when `signal` aborts.
 *
 * Note the batch is `entries`, not `records`, so this reads the same as the
 * other two wrappers. They're still `MutationRecord` objects.
 *
 * `MutationObserver` takes its options on `observe()` rather than on the
 * constructor, so every target here is observed with the same options. If you
 * need different options per node, call this once per set. At least one of
 * `attributes`, `characterData` or `childList` has to be set, or the browser
 * throws, the same as it would if you called `observe()` yourself.
 *
 * An already-aborted signal observes nothing.
 *
 * @example
 * ```ts
 * onMount({ signal }) {
 *   mutationObserver({
 *     targets: document.documentElement,
 *     attributes: true,
 *     attributeFilter: ['data-theme'],
 *     signal,
 *     on: {
 *       mutate() {
 *         repaint(document.documentElement.dataset['theme'])
 *       },
 *     },
 *   })
 * }
 * ```
 */
export function mutationObserver(properties: MutationObserverProperties): MutationObserver {
	const { on, signal, targets, ...init } = properties

	return connectObserver(
		new MutationObserver(toObserverCallback(on.mutate)),
		targets,
		signal,
		(observer, target) => observer.observe(target, init),
	)
}
