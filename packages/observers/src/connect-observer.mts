import { type ObserverTargets, toTargetList } from './observer-targets.mts'

/**
 * @internal
 * Observes every target and ties `disconnect()` to the signal.
 *
 * The three observers don't agree on what `observe()` takes, so the call itself
 * is passed in rather than described in the type. A signal that has already
 * aborted observes nothing.
 */
export function connectObserver<TObserver extends { disconnect(): void }, TTarget>(
	observer: TObserver,
	targets: ObserverTargets<TTarget>,
	signal: AbortSignal,
	observe: (observer: TObserver, target: TTarget) => void,
): TObserver {
	if (signal.aborted) return observer

	for (const target of toTargetList(targets)) observe(observer, target)
	signal.addEventListener('abort', () => observer.disconnect(), { once: true })

	return observer
}
