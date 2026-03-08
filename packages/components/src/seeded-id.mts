/**
 * ## Derive a scope ID from a component name
 *
 * Uses FNV-1a (64-bit) seeded with a global counter to hash the component name
 * into a base-36 string (~13 chars, 2^64 space).
 *
 * The result is deterministic within a single page load as long as components are
 * defined in the same order (i.e. module evaluation order is stable), so CSS selectors
 * remain consistent for the lifetime of the page.
 *
 * The counter ensures that duplicate component names still produce distinct scope IDs,
 * preventing style sheet collisions — duplicate names are warned about in development.
 *
 * **Not cryptographically secure** — intended only for CSS scope selectors.
 */
// Incremented per call so duplicate component names still produce distinct scope IDs
let SEED = 14695981039346656037n // FNV-1a 64-bit offset basis

export function seededId(name: string): string {
	let hash = SEED++
	for (let i = 0; i < name.length; i++) {
		hash ^= BigInt(name.charCodeAt(i))
		hash = BigInt.asUintN(64, hash * 1099511628211n) // FNV-1a 64-bit prime
	}
	return hash.toString(36)
}