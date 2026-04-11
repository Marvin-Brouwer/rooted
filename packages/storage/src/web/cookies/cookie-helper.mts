/**
 * Low-level helpers for composing and parsing the `document.cookie` string.
 *
 * These functions never touch `document.cookie` themselves. That lives in
 * {@link ./cookie-storage.mts}, which keeps this file trivially testable.
 */

const SAME_SITE_LABEL: Record<globalThis.CookieSameSite, string> = {
	lax: 'Lax',
	none: 'None',
	strict: 'Strict',
}

/**
 * Build the string to assign to `document.cookie` for a single cookie.
 *
 * Takes {@link globalThis.CookieInit} directly. `value` is expected to
 * already be a string. Callers in `cookie-storage.mts` handle JSON
 * encoding before reaching this layer.
 *
 * A few things happen on the way out:
 * - Name and value are URL-encoded.
 * - `expires` is converted from a `DOMHighResTimeStamp` to a UTC string.
 * - `SameSite=None` auto-adds `Secure`. The spec requires it, and
 *   browsers reject `SameSite=None` cookies without it.
 * - `null` attribute values are treated as unset, per the CookieStore spec.
 *
 * @example
 * ```ts
 * buildCookieString({ name: 'token', value: 'abc', path: '/', sameSite: 'lax' })
 * // 'token=abc; Path=/; SameSite=Lax'
 * ```
 */
export function buildCookieString(init: globalThis.CookieInit): string {
	const { name, value, domain, path, expires, sameSite, partitioned } = init

	const parts: string[] = [
		`${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
	]

	if (domain != undefined) parts.push(`Domain=${domain}`)
	if (path != undefined) parts.push(`Path=${path}`)
	if (expires != undefined) parts.push(`Expires=${new Date(expires).toUTCString()}`)
	if (sameSite != undefined) {
		parts.push(`SameSite=${SAME_SITE_LABEL[sameSite]}`)
		if (sameSite === 'none') parts.push('Secure')
	}
	if (partitioned === true) parts.push('Partitioned')

	return parts.join('; ')
}

/**
 * Parse the whole `document.cookie` string into a `Map<name, value>`.
 * Both sides are URL-decoded. Malformed entries are skipped rather than
 * raised as errors. See the `catch` inside for the reasoning.
 *
 * @example
 * ```ts
 * parseCookieHeader('a=1; b=2')
 * // Map(2) { 'a' => '1', 'b' => '2' }
 * ```
 */
export function parseCookieHeader(header: string): Map<string, string> {
	const result = new Map<string, string>()
	if (header.length === 0) return result

	for (const raw of header.split(';')) {
		const entry = raw.trim()
		if (entry.length === 0) continue

		const eq = entry.indexOf('=')
		if (eq === -1) continue

		const [key, value] = tryParseValue(entry, eq)
		if (key !== undefined) result.set(key, value)
	}

	return result
}

/**
 * `decodeURIComponent` throws on invalid percent-escapes
 * like `%ZZ` or a truncated `%C3`. \
 * Our own writes go through `encodeURIComponent` so they're always valid,
 * but document.cookie also surfaces cookies set
 * by the server, extensions, and other scripts that may not encode correctly.
 *
 * Skip the broken entry instead of letting one bad cookie crash the whole parse.
 */
function tryParseValue(entry: string, eq: number) {
	try {
		const name = decodeURIComponent(entry.slice(0, eq))
		const value = decodeURIComponent(entry.slice(eq + 1))
		return [name, value] as [key: string, value: string]
	}
	catch {
		return [] as never[]
	}
}
