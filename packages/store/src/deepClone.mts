/**
 * Returns a deep copy of `value`.
 *
 * What gets cloned: plain objects, arrays, `Date`, `Map`, `Set`, class instances, and any symbol-keyed properties on them. Cycles are handled.
 *
 * Functions stay shared by reference.
 *
 * Class instances are cloned structurally: a new object is created with the same prototype (so `instanceof` still works) and own properties are copied across. The trade-offs are real: private fields (`#field`) are lost, the constructor isn't re-run (no derived state, no observers re-wired), identity changes (`clone !== original`), and any `WeakMap`/`WeakSet` entries keyed on the original won't see the clone. If your class carries behaviour the clone needs to keep, prefer plain data.
 *
 * ```ts
 * import { deepClone } from '@rooted/store'
 *
 * const copy = deepClone(original)
 * copy.nested.field = 'changed' // does not affect original
 * ```
 */
export function deepClone<T>(value: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
	// eslint-disable-next-line unicorn/no-null
	if (value === null || typeof value !== 'object') return value
	const object = value as object
	if (seen.has(object)) return seen.get(object) as T

	if (value instanceof Date) return new Date(value.getTime()) as unknown as T

	if (value instanceof Map) {
		const copy = Reflect.construct(Map, [], value.constructor as new () => unknown) as Map<unknown, unknown>
		seen.set(object, copy)
		for (const [k, v] of value) copy.set(deepClone(k, seen), deepClone(v, seen))
		for (const key of Reflect.ownKeys(object)) {
			const v = (object as Record<string | symbol, unknown>)[key]
			;(copy as unknown as Record<string | symbol, unknown>)[key] = typeof v === 'function' ? v : deepClone(v, seen)
		}
		return copy as unknown as T
	}

	if (value instanceof Set) {
		const copy = Reflect.construct(Set, [], value.constructor as new () => unknown) as Set<unknown>
		seen.set(object, copy)
		for (const v of value) copy.add(deepClone(v, seen))
		for (const key of Reflect.ownKeys(object)) {
			const v = (object as Record<string | symbol, unknown>)[key]
			;(copy as unknown as Record<string | symbol, unknown>)[key] = typeof v === 'function' ? v : deepClone(v, seen)
		}
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
	const copy = (proto === Object.prototype || proto === null)
		? {} as Record<string | symbol, unknown>
		: Object.create(proto) as Record<string | symbol, unknown>
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
 * Plain objects, arrays, class instances, `Date`, `RegExp`, and `Error` get `Object.freeze`d along with their reachable contents. `Map` and `Set` are skipped, since `Object.freeze` doesn't stop mutation through their methods.
 */
export function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
	// eslint-disable-next-line unicorn/no-null
	if (value === null || typeof value !== 'object') return value
	const object = value as object
	if (seen.has(object)) return value
	seen.add(object)

	if (value instanceof Date || value instanceof RegExp || value instanceof Error) {
		Object.freeze(value)
		return value
	}

	if (value instanceof Map || value instanceof Set) {
		// Freezing a Map/Set doesn't stop mutation through its own methods, so don't pretend. Leave them mutable.
		return value
	}

	if (Array.isArray(value)) {
		for (const item of value) deepFreeze(item, seen)
		Object.freeze(value)
		return value
	}

	for (const key of Reflect.ownKeys(object)) {
		const v = (object as Record<string | symbol, unknown>)[key]
		if (typeof v !== 'function') deepFreeze(v, seen)
	}
	Object.freeze(value)
	return value
}
