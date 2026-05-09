import { jsonStringify, safeJsonParse } from '../../serializer.mts'

/**
 * Typed wrapper around the browser's `sessionStorage`. Same shape and same
 * guarantees as {@link import('./local-storage.mts').LocalStorage}; the only
 * difference is the underlying browser storage. Cleared when the tab closes.
 *
 * @example
 * ```ts
 * import { sessionStorage } from '@rooted/storage/web'
 *
 * sessionStorage.set('draft', { title: 'WIP' })
 * sessionStorage.get<{ title: string }>('draft') // { title: 'WIP' }
 *
 * sessionStorage.removeItem('draft')
 * ```
 */
export type SessionStorage = Pick<globalThis.Storage, 'length' | 'clear' | 'setItem' | 'removeItem'> & {
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
	// `globalThis.sessionStorage` is declared as `Storage` in the DOM
	// lib, so a direct `=== undefined` check trips the "always false"
	// warning. Reading it through a narrower shape lets the compiler
	// see that the property might be missing under SSR, while still
	// returning the real `Storage` when it exists.
	return (globalThis as { sessionStorage?: globalThis.Storage }).sessionStorage
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
 * The {@link SessionStorage} singleton. Frozen so individual methods can't
 * be monkey-patched.
 */
export const sessionStorage: SessionStorage = Object.freeze({
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
