/**
 * A small synchronous shared-state container. Not reactive. Useful when two
 * components need to agree on a piece of state and neither owns the other.
 *
 *
 * - [State guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/state.md)
 *
 * @module
 */

export { createStore, type ReadonlyState, type Store, type StoreEvent } from '../store.mts'
export { deepClone } from '../deepClone.mts'
