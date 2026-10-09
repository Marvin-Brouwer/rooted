import { isThenable } from '@rooted/util'

/**
 * Recursively freezes a value in place. Cycles are handled via a `seen` set.
 *
 * Plain objects, arrays, class instances, `Date`, `RegExp`, `Error`, `Map`, and `Set` get `Object.freeze`d along with their reachable contents. `Map` and `Set` mutating methods (`set`, `add`, `delete`, `clear`) are shadowed with own properties that throw a `TypeError`, since `Object.freeze` alone can't reach the internal slots those methods use.
 *
 * Functions and promises are left alone. `deepClone` shares both by reference, so freezing one here would reach back into the value the caller still holds.
 */
export function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
	// eslint-disable-next-line unicorn/no-null
	if (value === null || typeof value !== 'object') return value
	const object = value as object
	if (seen.has(object)) return value
	seen.add(object)

	if (isThenable(value)) return value

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
