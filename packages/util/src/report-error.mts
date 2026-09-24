/**
 * Hands `error` to the runtime's global error handling, the place an uncaught exception would end up.
 *
 * A ponyfill for the global `reportError`: it uses the native one when there is one,
 * and otherwise throws the error from a microtask. In a browser both land on `window`'s `error` event.
 * In Node the fallback is an uncaught exception, which crashes the process unless something listens for it.
 *
 * @example
 * ```ts
 * try {
 *   listener(event)
 * }
 * catch (error) {
 *   // Don't let one broken listener stop the rest, but don't hide it either.
 *   reportError(error)
 * }
 * ```
 */
export function reportError(error: unknown): void {
	if (typeof globalThis.reportError === 'function') globalThis.reportError(error)
	else queueMicrotask(() => { throw error })
}
