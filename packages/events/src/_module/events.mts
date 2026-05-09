/**
 * Typed event helpers and the unified `'unhandled-error'` channel that filters
 * cross-origin and extension noise out of `window.error` and
 * `unhandledrejection`.
 *
 *
 * - [Events](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/events.md)
 *
 * @module
 */

export * from '../event.mts'
export { type GlobalEventHandler, type GlobalEventMap, UnhandledErrorEvent, isApplicationErrorError } from '../global-events.mts'
