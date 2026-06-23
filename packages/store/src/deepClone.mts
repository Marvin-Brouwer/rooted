/**
 * Deep-clones a value without going through `structuredClone`.
 *
 * Why not `structuredClone`? Two reasons:
 * - It throws `DataCloneError` on any function it encounters, even nested ones.
 * - It silently drops symbol-keyed properties (so brand symbols disappear).
 *
 * This clone handles both: functions are kept by reference, and symbol keys
 * are copied via `Reflect.ownKeys`.
 *
 * Behaviour worth knowing:
 * - Plain objects, arrays, `Date`, `Map`, `Set` are cloned structurally.
 * - Cycles are handled via a `seen` map.
 * - Symbol-keyed properties are copied.
 * - Function values are shared by reference (not reconstructed).
 * - Class instances (objects whose prototype isn't `Object.prototype` or `null`)
 *   are shared by reference. The clone does not try to reconstruct them, since
 *   there's no general way to do that.
 *
 * @example
 * ```ts
 * import { deepClone } from '@rooted/store'
 *
 * const mine = deepClone(store.value)
 * mine.pad.aces = score // independent of the store
 * ```
 */
export function deepClone<T>(value: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
	// eslint-disable-next-line unicorn/no-null
	if (value === null || typeof value !== 'object') return value
	const object = value as object
	if (seen.has(object)) return seen.get(object) as T

	if (value instanceof Date) return new Date(value.getTime()) as unknown as T

	if (value instanceof Map) {
		const copy = new Map()
		seen.set(object, copy)
		for (const [k, v] of value) copy.set(deepClone(k, seen), deepClone(v, seen))
		return copy as unknown as T
	}

	if (value instanceof Set) {
		const copy = new Set()
		seen.set(object, copy)
		for (const v of value) copy.add(deepClone(v, seen))
		return copy as unknown as T
	}

	if (Array.isArray(value)) {
		const copy: unknown[] = []
		seen.set(object, copy)
		for (let index = 0; index < value.length; index++) copy[index] = deepClone(value[index], seen)
		// Copy symbol-keyed properties (e.g. brand symbols on tuples)
		for (const key of Object.getOwnPropertySymbols(object)) {
			(copy as Record<symbol, unknown>)[key] = (object as Record<symbol, unknown>)[key]
		}
		return copy as unknown as T
	}

	const proto = Object.getPrototypeOf(object)
	// eslint-disable-next-line unicorn/no-null
	if (proto !== Object.prototype && proto !== null) {
		// Opaque value: share class instances by reference, don't try to reconstruct them
		return value
	}

	const copy: Record<string | symbol, unknown> = {}
	seen.set(object, copy)
	for (const key of Reflect.ownKeys(object)) {
		const v = (object as Record<string | symbol, unknown>)[key]
		copy[key] = typeof v === 'function' ? v : deepClone(v, seen)
	}
	return copy as T
}

/**
 * Recursively freezes a value in place. Cycles are handled via a `seen` set.
 *
 * Plain objects, arrays, and `Date` instances are frozen along with their
 * contents. `Map` and `Set` instances and class instances (anything with a
 * prototype other than `Object.prototype` or `null`) are left alone — freezing
 * them either doesn't do anything useful or would mutate values the caller
 * shares with us by reference.
 */
export function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
	// eslint-disable-next-line unicorn/no-null
	if (value === null || typeof value !== 'object') return value
	const object = value as object
	if (seen.has(object)) return value
	seen.add(object)

	if (value instanceof Date) {
		Object.freeze(value)
		return value
	}

	if (value instanceof Map || value instanceof Set) {
		// Freezing a Map/Set doesn't stop mutation through its own methods,
		// so don't pretend. Leave them mutable.
		return value
	}

	if (Array.isArray(value)) {
		for (const item of value) deepFreeze(item, seen)
		Object.freeze(value)
		return value
	}

	const proto = Object.getPrototypeOf(object)
	// eslint-disable-next-line unicorn/no-null
	if (proto !== Object.prototype && proto !== null) {
		// Opaque value: leave it alone, deepClone shares this by reference
		return value
	}

	for (const key of Reflect.ownKeys(object)) {
		const v = (object as Record<string | symbol, unknown>)[key]
		if (typeof v !== 'function') deepFreeze(v, seen)
	}
	Object.freeze(value)
	return value
}
