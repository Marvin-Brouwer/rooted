/**
 * JSON helpers for cookie values.
 *
 * Local storage is an untrusted channel — any script on the origin (and the
 * server, and potentially other tabs) can set them. When we parse a value
 * back into an object, a malicious payload such as
 * `{"__proto__":{"polluted":true}}` would normally land on the returned
 * object's prototype unless we actively strip it. The {@link safeReviver}
 * defends against that class of prototype-pollution attack.
 */

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * A `JSON.parse` reviver that drops `__proto__`, `constructor`, and
 * `prototype` keys at any nesting depth.
 */
export function safeReviver(key: string, value: unknown): unknown {
	if (UNSAFE_KEYS.has(key)) return undefined
	return value
}

/**
 * Parse a JSON string using {@link safeReviver}. Returns `undefined` when
 * the input is not valid JSON — callers that want to fall back to the raw
 * string (e.g. plain-string cookies written by a server) can then do so.
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
 * Serialize a value for storage in a cookie. Thin wrapper around
 * `JSON.stringify` — exposed so the serialization point is explicit and
 * easy to swap in tests.
 */
export function jsonStringify(value: unknown): string {
	return JSON.stringify(value)
}
