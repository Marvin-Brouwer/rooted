/**
 * Returns `true` when running in a browser environment (i.e. `window` is
 * defined), `false` in SSR / Node contexts.
 */
export function isClient(): boolean {
	return typeof window !== 'undefined'
}
