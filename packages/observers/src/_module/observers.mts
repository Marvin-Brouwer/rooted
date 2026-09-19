/**
 * `IntersectionObserver`, `MutationObserver` and `ResizeObserver` wrapped so
 * they take an `AbortSignal` and disconnect themselves, the way `on` and
 * `Store.on` already do.
 *
 *
 * - [Observers](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/observers.md)
 *
 * @module
 */

export { type IntersectionObserverProperties, intersectionObserver } from '../intersection-observer.mts'
export { type MutationObserverProperties, mutationObserver } from '../mutation-observer.mts'
export { type ObserverHandler } from '../observer-handler.mts'
export { type ObserverTargets } from '../observer-targets.mts'
export { type ResizeObserverProperties, resizeObserver } from '../resize-observer.mts'
