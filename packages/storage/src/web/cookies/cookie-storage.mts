import { jsonStringify, safeJsonParse } from '../../serializer.mts'

import { buildCookieString, parseCookieHeader } from './cookie-helper.mts'
import { resolveCookiePath } from './cookie-path.mts'

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
 * `path` is resolved against the app base rather than the origin, so
 * `'/settings'` in an app served from `/my-repo/` becomes `/my-repo/settings`.
 * Leave it off and the cookie gets the app root.
 *
 * @example
 * ```ts
 * cookieStorage.set<{ id: number }>({
 *   name: 'session',
 *   value: { id: 7 },
 *   path: '/account',
 *   sameSite: 'lax',
 * })
 * ```
 */
export type CookieInit<T = unknown> = Omit<globalThis.CookieInit, 'value'> & {
	value: T
}

/**
 * Synchronous, typed wrapper around `document.cookie`. The basic shape
 * mirrors `localStorage` (`getItem`, `setItem`, `removeItem`). On top of
 * that:
 * - typed `get<T>` / `set<T>` for JSON-encoded values,
 * - a `set({ ... })` overload that forwards cookie attributes (`domain`,
 *   `path`, `expires`, `sameSite`, ...) to the browser,
 * - `names()` and `all()` for bulk reads.
 *
 * Every write gets a `Path`. Without one the browser scopes the cookie to the
 * directory of the page that set it, so a cookie written on `/recipes/pancakes`
 * would be invisible on the rest of the site. The default is the app root
 * (Vite's `BASE_URL`), and a `path` you pass is read relative to it.
 *
 * Typed reads run through a JSON reviver that drops `__proto__`,
 * `constructor`, and `prototype` keys at any depth, so a hostile cookie
 * value can't walk onto `Object.prototype`.
 *
 * SSR-safe: when `document` isn't there, reads return `undefined` or empty
 * collections and writes are no-ops.
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
 *   sameSite: 'lax',
 * })
 *
 * cookieStorage.removeItem('session')
 * ```
 */
export type CookieStorage = {
	/**
	 * Read a cookie as its raw (URL-decoded) string value.
	 * Returns `undefined` when the cookie is not set.
	 */
	getItem(name: string): string | undefined
	/**
	 * Write a raw string value with no serialization. The only attribute is
	 * the `Path`, which is the app root.
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
	 * attribute. `path` is resolved against the app base; leave it off to
	 * get the app root.
	 */
	set<T>(init: CookieInit<T>): void
	/**
	 * Delete a cookie by writing it with an empty value and `Expires=epoch`.
	 * The browser matches on the whole name/domain/path tuple. `path` gets
	 * the same treatment it does on write, so a cookie you set without one
	 * is removed without one too, but you still need to pass `domain` when
	 * the cookie was written with it.
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

function writeCookie(init: globalThis.CookieInit): void {
	// Resolve after the spread: `removeItem` always passes a `path` key, so a
	// default spread in front of it would be overwritten by its `undefined`.
	writeCookieHeader(buildCookieString({ ...init, path: resolveCookiePath(init.path) }))
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
	writeCookie({ name, value })
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
		writeCookie({ name: nameOrInit, value: serialized })
		return
	}

	const serialized = typeof nameOrInit.value === 'string'
		? nameOrInit.value
		: jsonStringify(nameOrInit.value)

	writeCookie({ ...nameOrInit, value: serialized })
}

function removeItem(name: string, options?: Pick<CookieInit, 'domain' | 'path'>): void {
	writeCookie({
		name,
		value: '',
		domain: options?.domain,
		path: options?.path,
		expires: 0,
	})
}

function names(): string[] {
	return [...readAll().keys()]
}

function all(): Map<string, string> {
	return readAll()
}

/**
 * The {@link CookieStorage} singleton. Frozen so individual methods can't be
 * monkey-patched.
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
