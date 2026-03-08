/**
 * ## Derive a scope ID from a component name
 *
 * Uses FNV-1a (64-bit) seeded with a global counter to hash the component name
 * into a base-36 string (8–14 chars, 2^64 space).
 *
 * Implemented with two 32-bit integers instead of BigInt for performance.
 * All intermediate products stay within `Number.MAX_SAFE_INTEGER`, so arithmetic
 * is exact without needing 64-bit types.
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

// FNV-1a 64-bit offset basis: 0xcbf29ce4_84222325
// Split into two 32-bit words; incremented per call so duplicate names produce distinct IDs
let seedHi = 0xcbf29ce4 >>> 0
let seedLo = 0x84222325 >>> 0

export function seededId(name: string): string {
	let hi = seedHi
	let lo = seedLo

	// Increment 64-bit seed for next call
	seedLo = (seedLo + 1) >>> 0
	if (seedLo === 0) seedHi = (seedHi + 1) >>> 0

	for (let i = 0; i < name.length; i++) {
		// FNV-1a: XOR then multiply
		lo = (lo ^ name.charCodeAt(i)) >>> 0

		// Multiply (hi:lo) by FNV-1a 64-bit prime 0x00000100_000001b3
		//   prime_hi = 0x100 (256),  prime_lo = 0x1b3 (435)
		//   lo  * prime_lo  ≤ (2³²−1) × 435  ≈ 1.87e12  — within MAX_SAFE_INTEGER ✓
		//   lo  * prime_hi  ≤ (2³²−1) × 256  ≈ 1.10e12  — within MAX_SAFE_INTEGER ✓
		//   hi  * prime_lo  ≤ (2³²−1) × 435  ≈ 1.87e12  — within MAX_SAFE_INTEGER ✓
		const product = lo * 0x1b3
		const carry   = Math.floor(product / 0x100000000)
		hi = (lo * 0x100 + hi * 0x1b3 + carry) >>> 0
		lo = product >>> 0
	}

	// lo is always padded to 7 chars (max 32-bit base-36 is "1z141z3", 7 chars),
	// so the string uniquely decomposes as [hi][lo₇] — no collisions possible.
	return hi.toString(36) + lo.toString(36).padStart(7, '0')
}