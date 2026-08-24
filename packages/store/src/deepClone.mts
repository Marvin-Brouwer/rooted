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
		for (const [entryKey, entryValue] of value) copy.set(deepClone(entryKey, seen), deepClone(entryValue, seen))
		cloneOwnProperties(object, copy, seen)
		return copy as unknown as T
	}

	if (value instanceof Set) {
		const copy = Reflect.construct(Set, [], value.constructor as new () => unknown) as Set<unknown>
		seen.set(object, copy)
		for (const entry of value) copy.add(deepClone(entry, seen))
		cloneOwnProperties(object, copy, seen)
		return copy as unknown as T
	}

	if (Array.isArray(value)) {
		const copy: unknown[] = []
		seen.set(object, copy)
		for (let index = 0; index < value.length; index++) copy[index] = deepClone(value[index], seen)
		// Carry over the own properties that aren't indices: brand symbols on tuples, stray string keys. The loop above already wrote every index, and `length` is own on any array, which is how cloneOwnProperties knows to leave those alone.
		cloneOwnProperties(object, copy, seen)
		return copy as unknown as T
	}

	const prototype = Object.getPrototypeOf(object)
	const copy = (prototype === Object.prototype || prototype === null)
		? {} as Record<string | symbol, unknown>
		: Object.create(prototype) as Record<string | symbol, unknown>
	seen.set(object, copy)
	cloneOwnProperties(object, copy, seen)
	return copy as T
}

// Copies every own property of `source` onto `target`, cloning the values and sharing functions by reference. Keys `target` already owns are left alone, which is what keeps the array branch from overwriting the indices it just filled in.
function cloneOwnProperties(source: object, target: object, seen: WeakMap<object, unknown>): void {
	const from = source as Record<string | symbol, unknown>
	const to = target as Record<string | symbol, unknown>
	for (const key of Reflect.ownKeys(from)) {
		if (Object.hasOwn(to, key)) continue
		const property = from[key]
		to[key] = typeof property === 'function' ? property : deepClone(property, seen)
	}
}

/**
 * Recursively freezes a value in place. Cycles are handled via a `seen` set.
 *
 * Plain objects, arrays, class instances, `Date`, `RegExp`, `Error`, `Map`, and `Set` get `Object.freeze`d along with their reachable contents. `Map` and `Set` mutating methods (`set`, `add`, `delete`, `clear`) are shadowed with own properties that throw a `TypeError`, since `Object.freeze` alone can't reach the internal slots those methods use.
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

	if (value instanceof Map) {
		for (const [entryKey, entryValue] of value) {
			deepFreeze(entryKey, seen)
			deepFreeze(entryValue, seen)
		}
		freezeOwnProperties(object, seen)
		blockMutation(object, ['set', 'delete', 'clear'])
		Object.freeze(value)
		return value
	}

	if (value instanceof Set) {
		for (const entry of value) deepFreeze(entry, seen)
		freezeOwnProperties(object, seen)
		blockMutation(object, ['add', 'delete', 'clear'])
		Object.freeze(value)
		return value
	}

	if (Array.isArray(value)) {
		freezeOwnProperties(object, seen)
		Object.freeze(value)
		return value
	}

	freezeOwnProperties(object, seen)
	Object.freeze(value)
	return value
}

function freezeOwnProperties(object: object, seen: WeakSet<object>): void {
	const properties = object as Record<string | symbol, unknown>
	for (const key of Reflect.ownKeys(properties)) {
		const property = properties[key]
		if (typeof property !== 'function') deepFreeze(property, seen)
	}
}

function blockMutation(object: object, methods: readonly string[]): void {
	const name = object.constructor.name
	for (const method of methods) {
		Object.defineProperty(object, method, {
			value: () => {
				throw new TypeError(`Cannot ${method} on a frozen ${name}`)
			},
			configurable: false,
			writable: false,
			enumerable: false,
		})
	}
}
