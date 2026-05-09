import { jsonStringify, safeJsonParse } from '../../serializer.mts'

/**
 * Typed wrapper around the browser's `localStorage`. Adds typed `get<T>` /
 * `set<T>` (JSON-encoded), a `keys()` helper, and `undefined` (instead of
 * `null`) for missing values. SSR-safe: when `localStorage` isn't there,
 * reads return `undefined` and writes are no-ops.
 *
 * Typed reads run through a JSON reviver that drops `__proto__`,
 * `constructor`, and `prototype` keys at any depth, so a hostile value
 * written by DevTools or another tab can't walk onto `Object.prototype`.
 *
 * @example
 * ```ts
 * import { localStorage } from '@rooted/storage/web'
 *
 * localStorage.set('theme', 'dark')
 * localStorage.get<string>('theme') // 'dark'
 *
 * localStorage.set<{ id: number }>('session', { id: 7 })
 * localStorage.get<{ id: number }>('session') // { id: 7 }
 *
 * localStorage.removeItem('session')
 * ```
 */
export type LocalStorage = Pick<globalThis.Storage, 'length' | 'clear' | 'setItem' | 'removeItem'> & {
	/** Read the raw string value. Returns `undefined` when the key isn't set. */
	getItem(key: string): string | undefined
	/**
	 * Return the key at `index` in insertion order. Returns `undefined` when
	 * `index` is out of range (instead of the native `null`).
	 */
	key(index: number): string | undefined
	/**
	 * Read and JSON-parse a stored value. Strings come back as-is; everything
	 * else is parsed through a prototype-pollution-safe reviver. Returns
	 * `undefined` when the key is missing.
	 */
	get<T = unknown>(key: string): T | undefined
	/**
	 * Write a value. Strings pass through unchanged so values written by
	 * `setItem` round-trip; everything else is JSON-encoded.
	 */
	set<T>(key: string, value: T): void
	/** All keys currently stored. Empty array under SSR. */
	keys(): string[]
}

function getNative(): globalThis.Storage | undefined {
	// `globalThis.localStorage` is declared as `Storage` in the DOM lib,
	// so a direct `=== undefined` check trips the "always false"
	// warning. Reading it through a narrower shape lets the compiler
	// see that the property might be missing under SSR, while still
	// returning the real `Storage` when it exists.
	return (globalThis as { localStorage?: globalThis.Storage }).localStorage
}

function getItem(key: string): string | undefined {
	const store = getNative()
	if (store === undefined) return undefined
	return store.getItem(key) ?? undefined
}

function setItem(key: string, value: string): void {
	const store = getNative()
	if (store === undefined) return
	store.setItem(key, value)
}

function removeItem(key: string): void {
	const store = getNative()
	if (store === undefined) return
	store.removeItem(key)
}

function clear(): void {
	const store = getNative()
	if (store === undefined) return
	store.clear()
}

function key(index: number): string | undefined {
	const store = getNative()
	if (store === undefined) return undefined
	return store.key(index) ?? undefined
}

function get<T = unknown>(key: string): T | undefined {
	const raw = getItem(key)
	if (raw === undefined) return undefined

	const parsed = safeJsonParse<T>(raw)
	if (parsed !== undefined) return parsed

	// Plain-string values (written via `setItem`, or by another tab)
	// aren't valid JSON, so `safeJsonParse` gives up on them. Hand the
	// raw string back so `get<string>` still works.
	return raw as T
}

function set<T>(key: string, value: T): void {
	const serialized = typeof value === 'string' ? value : jsonStringify(value)
	setItem(key, serialized)
}

function keys(): string[] {
	const store = getNative()
	if (store === undefined) return []

	const result: string[] = []
	for (let index = 0; index < store.length; index++) {
		const name = store.key(index)
		if (name != undefined) result.push(name)
	}
	return result
}

/**
 * The {@link LocalStorage} singleton. Frozen so individual methods can't be
 * monkey-patched.
 */
export const localStorage: LocalStorage = Object.freeze({
	clear,
	getItem,
	key,
	removeItem,
	setItem,
	get,
	set,
	keys,
	get length(): number {
		const store = getNative()
		return store === undefined ? 0 : store.length
	},
})
