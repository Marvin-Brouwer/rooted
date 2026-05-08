import { jsonStringify, safeJsonParse } from '../../serializer.mts'

import { buildCookieString, parseCookieHeader } from './cookie-helper.mts'

/**
 * Re-export of {@link globalThis.CookieSameSite} so you have a single
 * import path for everything cookie-related.
 */
export type CookieSameSite = globalThis.CookieSameSite

/**
 * Typed counterpart of {@link globalThis.CookieInit}.
 *
 * Everything except `value` is inherited from the DOM type via `Omit`.
 * `value` is widened to a generic `T` so you can hand it any value that
 * round-trips through `JSON.stringify`. Fields added to `CookieInit` by
 * future TypeScript lib updates (`partitioned` for example) come along
 * for free.
 *
 * @example
 * ```ts
 * cookieStorage.set<{ id: number }>({
 *   name: 'session',
 *   value: { id: 7 },
 *   path: '/',
 *   sameSite: 'lax',
 * })
 * ```
 */
export type CookieInit<T = unknown> = Omit<globalThis.CookieInit, 'value'> & {
	value: T
}

/**
 * Synchronous, typed wrapper around `document.cookie`.
 *
 * The shape mirrors {@link globalThis.Storage} (so `getItem`, `setItem`,
 * `removeItem` all behave like they do on `localStorage`) and adds a few
 * things on top:
 * - typed `get<T>` / `set<T>` that run values through `JSON.stringify`
 *   and `JSON.parse` for you,
 * - a `set({ ... })` overload that forwards full cookie attributes
 *   (`domain`, `path`, `expires`, `sameSite`, ...) to the browser,
 * - `names()` and `all()` for bulk reads.
 *
 * Typed reads are safe against prototype pollution. The parsed JSON is
 * passed through a reviver that drops `__proto__`, `constructor`, and
 * `prototype` keys at any depth, so a hostile cookie value cannot walk
 * onto `Object.prototype`.
 *
 * Safe to import under SSR. When `document` is not available reads
 * return `undefined` or empty collections and writes become no-ops, so
 * nothing throws at import time or during the first render on the
 * server.
 *
 * @example
 * ```ts
 * import { cookieStorage } from '@rooted/storage/web'
 *
 * cookieStorage.set('theme', 'dark')
 * cookieStorage.get<string>('theme') // 'dark'
 *
 * cookieStorage.set<{ id: number }>({
 *   name: 'session',
 *   value: { id: 7 },
 *   path: '/',
 *   sameSite: 'lax',
 * })
 *
 * cookieStorage.removeItem('session', { path: '/' })
 * ```
 */
export type CookieStorage = {
	/**
	 * Read a cookie as its raw (URL-decoded) string value.
	 * Returns `undefined` when the cookie is not set.
	 */
	getItem(name: string): string | undefined
	/**
	 * Write a raw string value with no serialization and no attributes.
	 * Equivalent to `document.cookie = 'name=value'`.
	 */
	setItem(name: string, value: string): void
	/**
	 * Typed read. Strings come back as-is, everything else is parsed
	 * from JSON through a prototype-pollution-safe reviver. Returns
	 * `undefined` when the cookie is missing.
	 */
	get<T = unknown>(name: string): T | undefined
	/**
	 * Typed write. Strings pass through unchanged so server-set cookies
	 * round-trip, everything else is JSON-encoded.
	 */
	set<T>(name: string, value: T): void
	/**
	 * Typed write with full cookie attributes. Use this form when you
	 * need to set `domain`, `path`, `expires`, `sameSite`, or any other
	 * attribute.
	 */
	set<T>(init: CookieInit<T>): void
	/**
	 * Delete a cookie by writing it with an empty value and `Expires=epoch`.
	 * Pass `domain` and `path` when the cookie was originally written with
	 * them. The browser matches on the whole tuple, so omitting them
	 * leaves the original cookie in place.
	 */
	removeItem(name: string, options?: Pick<CookieInit, 'domain' | 'path'>): void
	/** Every cookie name currently visible to `document.cookie`. */
	names(): string[]
	/** Every cookie as a `Map<name, rawValue>`. */
	all(): Map<string, string>
}

function getCookieHeader(): string | undefined {
	if (typeof document === 'undefined') return undefined
	return document.cookie
}

function writeCookieHeader(serialized: string): void {
	if (typeof document === 'undefined') return
	document.cookie = serialized
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

	// Plain-string cookies (for example ones written by a server without
	// JSON wrapping) aren't valid JSON, so `safeJsonParse` gives up on
	// them. Hand the raw string back so `get<string>` still works.
	return raw as T
}

function set<T>(nameOrInit: string | CookieInit<T>, value?: T): void {
	if (typeof nameOrInit === 'string') {
		const serialized = typeof value === 'string' ? value : jsonStringify(value)
		writeCookieHeader(buildCookieString({ name: nameOrInit, value: serialized }))
		return
	}

	const serialized = typeof nameOrInit.value === 'string'
		? nameOrInit.value
		: jsonStringify(nameOrInit.value)

	writeCookieHeader(buildCookieString({ ...nameOrInit, value: serialized }))
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
 * The singleton {@link CookieStorage} instance. Frozen so callers can't
 * monkey-patch individual methods.
 *
 * @example
 * ```ts
 * import { cookieStorage } from '@rooted/storage/web'
 *
 * cookieStorage.setItem('token', 'abc123')
 * cookieStorage.getItem('token') // 'abc123'
 * ```
 */
export const cookieStorage: CookieStorage = Object.freeze({
	getItem,
	setItem,
	get,
	set: set,
	removeItem,
	names,
	all,
})
