/**
 * Returns `true` when running in a browser environment (i.e. `window` is
 * defined), `false` in SSR / Node contexts.
 */
export function isClient(): boolean {
	// eslint-disable-next-line unicorn/prefer-global-this
	return typeof window !== 'undefined'
}
