import { jsonStringify, safeJsonParse } from '../../serializer.mts'

import { buildCookieString, parseCookieHeader } from './cookie-helper.mts'

/**
 * Re-export of the DOM global {@link globalThis.CookieSameSite} so
 * consumers have a single import path for all cookie-related types.
 */
export type CookieSameSite = globalThis.CookieSameSite

/**
 * Typed counterpart of the DOM global {@link globalThis.CookieInit}.
 *
 * All attribute fields are inherited from the DOM type via `Omit`; only
 * `value` is widened from `string` to a generic `T` so consumers can pass
 * any JSON-serialisable value. Fields added to `CookieInit` by future
 * TypeScript lib updates (e.g. `partitioned`) are inherited automatically.
 */
export type CookieInit<T = unknown> = Omit<globalThis.CookieInit, 'value'> & {
	value: T
}

/**
 * Synchronous, typed wrapper around `document.cookie`.
 *
 * The shape mirrors {@link globalThis.Storage} (hence
 * `getItem`/`setItem`/`removeItem`) and adds:
 * - typed {@link CookieStorage.get | `get<T>`} /
 *   {@link CookieStorage.set | `set<T>`} with JSON serialisation under the
 *   hood,
 * - a `set({ ... })` overload that forwards full
 *   {@link CookieInit | cookie attributes} (domain, path, expires, sameSite,
 *   …) to the browser,
 * - {@link CookieStorage.names | `names()`} and
 *   {@link CookieStorage.all | `all()`} for bulk reads.
 *
 * Prototype-pollution guard: typed reads pass the parsed JSON through a
 * reviver that strips `__proto__`, `constructor`, and `prototype` at any
 * depth — a hostile cookie value cannot walk onto `Object.prototype`.
 *
 * Runs safely under SSR: when `document` is unavailable, reads return
 * `undefined` / empty collections and writes are no-ops.
 */
export type CookieStorage = {
	/**
	 * Read the raw (already URL-decoded) cookie string.
	 * Returns `undefined` when the cookie is not set.
	 */
	getItem(name: string): string | undefined
	/**
	 * Write a raw string value with no serialisation, no attributes.
	 * Equivalent to `document.cookie = 'name=value'`.
	 */
	setItem(name: string, value: string): void
	/**
	 * Typed read. Strings are returned as-is; everything else is parsed
	 * from JSON through a prototype-pollution-safe reviver. Returns
	 * `undefined` when the cookie is missing, and also when JSON parsing
	 * fails for a non-string `T`.
	 */
	get<T = unknown>(name: string): T | undefined
	/**
	 * Typed write. Strings pass through unchanged so server-set cookies
	 * round-trip; every other value is JSON-encoded.
	 */
	set<T>(name: string, value: T): void
	/**
	 * Typed write with the full {@link CookieInit} attribute set
	 * (`domain`, `path`, `expires`, `sameSite`, …).
	 */
	set<T>(init: CookieInit<T>): void
	/**
	 * Delete a cookie by setting it to an empty value with `Expires=epoch`.
	 * Pass `domain`/`path` when the cookie was originally written with
	 * them — the browser matches on the tuple, so omitting them leaks the
	 * stale cookie.
	 */
	removeItem(name: string, options?: Pick<CookieInit, 'domain' | 'path'>): void
	/** All cookie names currently visible to `document.cookie`. */
	names(): string[]
	/** All cookies as a `Map<name, rawValue>`. */
	all(): Map<string, string>
}

function getCookieHeader(): string | undefined {
	if (typeof document === 'undefined') return undefined
	return document.cookie
}

function writeCookieHeader(serialised: string): void {
	if (typeof document === 'undefined') return
	document.cookie = serialised
}

function readAll(): Map<string, string> {
	const header = getCookieHeader()
	if (header === undefined) return new Map()
	return parseCookieHeader(header)
}

function getItem(name: string): string | undefined {
	return readAll().get(name)
}

function setItem(name: string, value: string): void {
	writeCookieHeader(buildCookieString({ name, value }))
}

function get<T = unknown>(name: string): T | undefined {
	const raw = getItem(name)
	if (raw === undefined) return undefined

	const parsed = safeJsonParse<T>(raw)
	if (parsed !== undefined) return parsed

	// Plain-string cookies (e.g. set by a server with no JSON wrapping)
	// aren't valid JSON — hand the raw string back so `get<string>` works.
	return raw as T
}

function set<T>(nameOrInit: string | CookieInit<T>, value?: T): void {
	if (typeof nameOrInit === 'string') {
		const serialised = typeof value === 'string' ? value : jsonStringify(value)
		writeCookieHeader(buildCookieString({ name: nameOrInit, value: serialised }))
		return
	}

	const serialised = typeof nameOrInit.value === 'string'
		? nameOrInit.value
		: jsonStringify(nameOrInit.value)

	writeCookieHeader(buildCookieString({ ...nameOrInit, value: serialised }))
}

function removeItem(name: string, options?: Pick<CookieInit, 'domain' | 'path'>): void {
	writeCookieHeader(buildCookieString({
		name,
		value: '',
		domain: options?.domain,
		path: options?.path,
		expires: 0,
	}))
}

function names(): string[] {
	return [...readAll().keys()]
}

function all(): Map<string, string> {
	return readAll()
}

/**
 * The singleton {@link CookieStorage} instance.
 * Frozen so consumers can't monkey-patch individual methods.
 */
export const cookieStorage: CookieStorage = Object.freeze({
	getItem,
	setItem,
	get,
	set: set as CookieStorage['set'],
	removeItem,
	names,
	all,
})
