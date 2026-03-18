/**
 * ## Derive a scope ID from a string (e.g. a CSS file path)
 *
 * Pure FNV-1a (64-bit) hash of the input string.
 * Returns a base-36 string (8–14 chars, 2^64 space).
 *
 * Implemented with two 32-bit integers instead of BigInt for performance.
 * All intermediate products stay within `Number.MAX_SAFE_INTEGER`, so arithmetic
 * is exact without needing 64-bit types.
 *
 * The result is deterministic and stable across builds and machines —
 * the same input always produces the same output.
 *
 * **Not cryptographically secure** — intended only for CSS scope selectors.
 */

// FNV-1a 64-bit offset basis: 0xcbf29ce4_84222325
// Split into two 32-bit words
const seedHi = 0xCB_F2_9C_E4 >>> 0
const seedLo = 0x84_22_23_25 >>> 0

export function seededId(name: string): string {
	let hi = seedHi
	let lo = seedLo

	for (let index = 0; index < name.length; index++) {
		// FNV-1a: XOR then multiply
		lo = (lo ^ (name.codePointAt(index) ?? 0)) >>> 0

		// Multiply (hi:lo) by FNV-1a 64-bit prime 0x00000100_000001b3
		//   prime_hi = 0x100 (256),  prime_lo = 0x1b3 (435)
		//   lo  * prime_lo  ≤ (2³²−1) × 435  ≈ 1.87e12  — within MAX_SAFE_INTEGER ✓
		//   lo  * prime_hi  ≤ (2³²−1) × 256  ≈ 1.10e12  — within MAX_SAFE_INTEGER ✓
		//   hi  * prime_lo  ≤ (2³²−1) × 435  ≈ 1.87e12  — within MAX_SAFE_INTEGER ✓
		const product = lo * 0x1_B3
		const carry = Math.floor(product / 0x1_00_00_00_00)
		hi = (lo * 0x1_00 + hi * 0x1_B3 + carry) >>> 0
		lo = product >>> 0
	}

	// lo is always padded to 7 chars (max 32-bit base-36 is "1z141z3", 7 chars),
	// so the string uniquely decomposes as [hi][lo₇] — no collisions possible.
	return hi.toString(36) + lo.toString(36).padStart(7, '0')
}
