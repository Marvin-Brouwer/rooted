/**
 * JSON helpers for values read out of storage.
 *
 * Any storage that isn't sandboxed to our own code is an untrusted channel.
 * Cookies can be set by the server, other scripts on the origin, or the
 * browser itself; `localStorage` can be poked at from DevTools or other
 * tabs. When we parse a value back into an object, a payload like
 * `{"__proto__":{"polluted":true}}` would normally land on the returned
 * object's prototype unless we actively strip it. {@link safeReviver} is
 * what stops that from happening.
 */

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * A `JSON.parse` reviver that drops `__proto__`, `constructor`, and
 * `prototype` keys at any nesting depth.
 *
 * You normally don't call this directly. {@link safeJsonParse} wires it up
 * for you. It's exported so you can pass it to `JSON.parse` yourself if
 * you already handle the try/catch.
 *
 * @example
 * ```ts
 * const parsed = JSON.parse(raw, safeReviver)
 * ```
 */
export function safeReviver(key: string, value: unknown): unknown {
	if (UNSAFE_KEYS.has(key)) return undefined
	return value
}

/**
 * Parse a JSON string using {@link safeReviver}.
 *
 * Returns `undefined` when the input is not valid JSON, so callers can
 * fall back to the raw string. Plain-string cookies written by a server
 * rely on this (they aren't quoted, so `JSON.parse` rejects them).
 *
 * @example
 * ```ts
 * const value = safeJsonParse<{ id: number }>(raw) ?? defaultValue
 * ```
 */
export function safeJsonParse<T>(raw: string): T | undefined {
	try {
		return JSON.parse(raw, safeReviver) as T
	}
	catch {
		return undefined
	}
}

/**
 * Serialize a value for storage. Thin wrapper around `JSON.stringify`
 * so the serialization point is easy to find and easy to swap in tests.
 */
export function jsonStringify(value: unknown): string {
	return JSON.stringify(value)
}
