import { createGlobalAbortSignal } from '@rooted/util'

/**
 * @internal
 * What a store subscription listens on when the caller doesn't pass a signal.
 * Aborts when the page is permanently unloaded.
 *
 * Separate from the components package's signal on purpose: stores are usable
 * without the rest of the framework, and neither half should be able to abort
 * the other's listeners.
 */
export const storeAbortSignal: AbortSignal = createGlobalAbortSignal()
