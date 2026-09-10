import { createGlobalAbortSignal } from '@rooted/util'

/**
 * @internal
 * The signal every component's `AbortController` chains to. Aborts when the
 * page is permanently unloaded, so unmounting and page tear-down both clean up
 * listeners with no user code.
 *
 * Consumed by `GenericComponent`. Not part of the public API.
 */
export const pageAbortSignal: AbortSignal = createGlobalAbortSignal()
