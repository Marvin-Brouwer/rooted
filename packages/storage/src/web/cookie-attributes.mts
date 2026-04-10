/**
 * Low-level helpers for composing and parsing the `document.cookie` string.
 *
 * These functions never touch `document.cookie` themselves — that lives in
 * {@link ./cookie-storage.mts} — which keeps them trivially unit-testable.
 */

/**
 * Input shape for {@link buildCookieString}. Mirrors the subset of
 * `globalThis.CookieInit` we forward to the browser, plus the already
 * serialised string value.
 */
export type CookieAttributes = {
	name: string
	/** Already-serialised string value. */
	value: string
	domain?: string
	path?: string
	/** Absolute expiry as a DOMHighResTimeStamp (ms since epoch). */
	expires?: DOMHighResTimeStamp
	sameSite?: globalThis.CookieSameSite
}

const SAME_SITE_LABEL: Record<globalThis.CookieSameSite, string> = {
	lax: 'Lax',
	none: 'None',
	strict: 'Strict',
}

/**
 * Build the string to assign to `document.cookie` for a single cookie.
 *
 * - Name and value are URL-encoded.
 * - `expires` is converted from a `DOMHighResTimeStamp` to a UTC string.
 * - `SameSite=None` auto-adds `Secure` (required by the spec — browsers
 *   reject `SameSite=None` cookies without it).
 */
export function buildCookieString(attributes: CookieAttributes): string {
	const { name, value, domain, path, expires, sameSite } = attributes

	const parts: string[] = [
		`${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
	]

	if (domain !== undefined) parts.push(`Domain=${domain}`)
	if (path !== undefined) parts.push(`Path=${path}`)
	if (expires !== undefined) parts.push(`Expires=${new Date(expires).toUTCString()}`)
	if (sameSite !== undefined) {
		parts.push(`SameSite=${SAME_SITE_LABEL[sameSite]}`)
		if (sameSite === 'none') parts.push('Secure')
	}

	return parts.join('; ')
}

/**
 * Parse the whole `document.cookie` string into a `Map<name, value>`.
 * Both sides are URL-decoded. Malformed entries are skipped silently —
 * the browser is the source of truth, not this parser, so defensive
 * tolerance is correct here.
 */
export function parseCookieHeader(header: string): Map<string, string> {
	const result = new Map<string, string>()
	if (header.length === 0) return result

	for (const raw of header.split(';')) {
		const entry = raw.trim()
		if (entry.length === 0) continue

		const eq = entry.indexOf('=')
		if (eq === -1) continue

		try {
			const name = decodeURIComponent(entry.slice(0, eq))
			const value = decodeURIComponent(entry.slice(eq + 1))
			result.set(name, value)
		}
		catch {
			// Malformed percent-encoding — skip the entry rather than throw.
		}
	}

	return result
}
