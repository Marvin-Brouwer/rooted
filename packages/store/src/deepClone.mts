import { isThenable } from '@rooted/util'

import { isBinaryData } from './binary-data.mts'

/**
 * Returns a deep copy of `value`.
 *
 * What gets cloned: plain objects, arrays, `Date`, `Map`, `Set`, typed arrays, `ArrayBuffer`, `DataView`, class instances, and any symbol-keyed properties on them. Cycles are handled.
 *
 * Functions stay shared by reference, and so do promises. A promise's state lives in internal slots no copy can reach, so a structural copy of one is a dead object that throws the moment you await it. Sharing the reference is the only thing that works. The check is a callable `then`, so any thenable counts, not just a native `Promise`.
 *
 * Typed arrays, `ArrayBuffer` and `DataView` are copied with their own `slice`, so the copy is a real one that works with `Blob`, IndexedDB and the rest. A typed array subclass stays a subclass. Each view gets a buffer holding only the bytes it covers: a `subarray` doesn't drag its whole parent buffer along, but two views that shared a buffer in the original don't share one in the copy. Own properties on them (a brand symbol, say) aren't carried over. A buffer that reports itself `immutable` (the Immutable ArrayBuffer proposal, not in Node 22 yet) can't be written by anyone, so it's shared instead of copied, and so is any view over it.
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

	if (isThenable(value)) return value

	if (isBinaryData(object)) {
		const copy = cloneBinaryData(object)
		seen.set(object, copy)
		return copy as T
	}

	if (value instanceof Date) return new Date(value.getTime()) as unknown as T

	if (value instanceof Map) {
		const copy = Reflect.construct(Map, [], value.constructor as new () => unknown) as Map<unknown, unknown>
		seen.set(object, copy)
		for (const [entryKey, entryValue] of value) {
			copy.set(deepClone(entryKey, seen), deepClone(entryValue, seen))
		}
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
		for (let index = 0; index < value.length; index++) {
			copy[index] = deepClone(value[index], seen)
		}
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

// Copies the bytes a binary value covers into a buffer of its own, or hands back the value itself when its buffer is immutable.
function cloneBinaryData(value: ArrayBuffer | ArrayBufferView): ArrayBuffer | ArrayBufferView {
	if (value instanceof ArrayBuffer) return isImmutable(value) ? value : value.slice(0)
	if (isImmutable(value.buffer)) return value
	if (value instanceof DataView) {
		return new DataView(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
	}
	// Every typed array has slice, and it builds the result through the value's own constructor, which is what keeps subclasses.
	return (value as Uint8Array).slice()
}

// The Immutable ArrayBuffer proposal adds an `immutable` getter. On a runtime without it this reads undefined, so nothing is shared.
function isImmutable(buffer: ArrayBufferLike): boolean {
	return (buffer as { immutable?: boolean }).immutable === true
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
