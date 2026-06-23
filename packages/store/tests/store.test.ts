import { describe, expect, test, vi } from 'vitest'

import { deepClone, deepFreeze } from '../src/deepClone.mts'
import { hashState } from '../src/hash.mts'
import { createStore } from '../src/store.mts'

describe('createStore — value', () => {
	test('returns initial state', () => {
		const store = createStore({ count: 0 })
		expect(store.value).toEqual({ count: 0 })
	})

	test('value is a frozen snapshot, not the internal reference', () => {
		const store = createStore({ count: 0 })
		const snapshot = store.value
		store.update((s) => {
			s.count = 1
		})
		expect(snapshot.count).toBe(0) // old snapshot unchanged
		expect(store.value.count).toBe(1)
	})

	test('value is frozen', () => {
		const store = createStore({ count: 0 })
		expect(Object.isFrozen(store.value)).toBe(true)
	})
})

describe('createStore — update', () => {
	test('applies mutation (void return)', () => {
		const store = createStore({ count: 0 })
		store.update((s) => {
			s.count = 5
		})
		expect(store.value.count).toBe(5)
	})

	test('applies partial return (merges into state)', () => {
		const store = createStore({ a: 1, b: 2 })
		store.update(() => ({ a: 99 }))
		expect(store.value).toEqual({ a: 99, b: 2 })
	})

	test('setter sees the post-update state on the next call', () => {
		const store = createStore({ items: [1, 2, 3] })
		store.update((s) => {
			s.items.push(4)
		})
		store.update((s) => {
			expect(s.items).toEqual([1, 2, 3, 4])
		})
	})

	test('snapshot is independent of post-update mutations to captured refs', () => {
		const store = createStore({ count: 0 })
		const snapshot = store.value

		let captured: { count: number } | undefined
		store.update((s) => {
			captured = s
		})
		// The setter received the live state ref. Mutating it after the setter
		// returns is unusual but allowed; the snapshot taken before is frozen
		// and independent.
		captured!.count = 999
		expect(snapshot.count).toBe(0)
		expect(Object.isFrozen(snapshot)).toBe(true)
	})
})

describe('createStore — update event', () => {
	test('fires on every update call', () => {
		const store = createStore({ count: 0 })
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('update', controller.signal, handler)

		store.update((s) => {
			s.count = 1
		})
		store.update((s) => {
			s.count = 1
		}) // same value — no hash change
		expect(handler).toHaveBeenCalledTimes(2)
		controller.abort()
	})

	test('event detail contains current state', () => {
		const store = createStore({ count: 0 })
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('update', controller.signal, handler)

		store.update((s) => {
			s.count = 7
		})
		const event = handler.mock.calls[0][0] as CustomEvent<{ state: { count: number } }>
		expect(event.detail.state.count).toBe(7)
		controller.abort()
	})
})

describe('createStore — change event', () => {
	test('fires only when hash differs', () => {
		const store = createStore({ count: 0 })
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('change', controller.signal, handler)

		store.update((s) => {
			s.count = 1
		})
		store.update((s) => {
			s.count = 1
		}) // same value
		expect(handler).toHaveBeenCalledTimes(1)
		controller.abort()
	})

	test('fires again when value changes back', () => {
		const store = createStore({ count: 0 })
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('change', controller.signal, handler)

		store.update((s) => {
			s.count = 1
		})
		store.update((s) => {
			s.count = 0
		})
		expect(handler).toHaveBeenCalledTimes(2)
		controller.abort()
	})
})

describe('createStore — signal cleanup', () => {
	test('listener is removed when signal aborts', () => {
		const store = createStore({ count: 0 })
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('update', controller.signal, handler)

		store.update((s) => {
			s.count = 1
		})
		expect(handler).toHaveBeenCalledTimes(1)

		controller.abort()
		store.update((s) => {
			s.count = 2
		})
		expect(handler).toHaveBeenCalledTimes(1) // no new calls after abort
	})
})

describe('hashState — key ordering', () => {
	test('objects with same keys in different insertion order produce same change hash', () => {
		// Build two stores whose state is semantically identical but key-ordered differently
		const a = createStore<Record<string, number>>({})
		const b = createStore<Record<string, number>>({})

		const aChanges = vi.fn()
		const bChanges = vi.fn()
		const controller = new AbortController()
		a.on('change', controller.signal, aChanges)
		b.on('change', controller.signal, bChanges)

		a.update(() => ({ x: 1, y: 2 }))
		b.update(() => ({ y: 2, x: 1 })) // different insertion order, same data

		// Both should have fired change once (from initial empty state)
		expect(aChanges).toHaveBeenCalledTimes(1)
		expect(bChanges).toHaveBeenCalledTimes(1)

		// Now update both to the "same" state again — neither should fire change
		a.update(() => ({ x: 1, y: 2 }))
		b.update(() => ({ y: 2, x: 1 }))
		expect(aChanges).toHaveBeenCalledTimes(1)
		expect(bChanges).toHaveBeenCalledTimes(1)

		controller.abort()
	})

	test('Date values hash consistently', () => {
		const date = new Date('2026-01-01T00:00:00.000Z')
		const store = createStore({ ts: date })
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('change', controller.signal, handler)

		store.update((s) => {
			s.ts = new Date('2026-01-01T00:00:00.000Z')
		}) // same date, new instance
		expect(handler).toHaveBeenCalledTimes(0) // no change

		store.update((s) => {
			s.ts = new Date('2027-01-01T00:00:00.000Z')
		})
		expect(handler).toHaveBeenCalledTimes(1)
		controller.abort()
	})
})

describe('createStore — no initial value', () => {
	test('value is undefined when created without argument', () => {
		const store = createStore<string>()
		expect(store.value).toBeUndefined()
	})

	test('can update from undefined to a value', () => {
		const store = createStore<string>()
		store.update(() => 'hello')
		expect(store.value).toBe('hello')
	})

	test('change fires when transitioning from undefined', () => {
		const store = createStore<string>()
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('change', controller.signal, handler)

		store.update(() => 'hello')
		expect(handler).toHaveBeenCalledTimes(1)
		controller.abort()
	})

	test('change does not fire when staying undefined', () => {
		const store = createStore<string>()
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('change', controller.signal, handler)

		store.update(() => undefined)
		expect(handler).toHaveBeenCalledTimes(0)
		controller.abort()
	})
})

describe('createStore — primitive state', () => {
	test('value returns the initial primitive', () => {
		const store = createStore<'idle' | 'navigating'>('idle')
		expect(store.value).toBe('idle')
	})

	test('update replaces primitive state', () => {
		const store = createStore<'idle' | 'navigating'>('idle')
		store.update(() => 'navigating')
		expect(store.value).toBe('navigating')
	})

	test('change fires when primitive differs', () => {
		const store = createStore<'idle' | 'navigating'>('idle')
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('change', controller.signal, handler)

		store.update(() => 'navigating')
		expect(handler).toHaveBeenCalledTimes(1)
		controller.abort()
	})

	test('change does not fire for same primitive value', () => {
		const store = createStore<'idle' | 'navigating'>('navigating')
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('change', controller.signal, handler)

		store.update(() => 'navigating') // no change
		store.update(() => 'navigating') // still no change
		expect(handler).toHaveBeenCalledTimes(0)
		controller.abort()
	})

	test('update fires on every primitive update call', () => {
		const store = createStore<'idle' | 'navigating'>('idle')
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('update', controller.signal, handler)

		store.update(() => 'navigating')
		store.update(() => 'navigating') // same value, but update still fires
		expect(handler).toHaveBeenCalledTimes(2)
		controller.abort()
	})
})

describe('createStore - value caching', () => {
	test('value returns the same frozen snapshot between updates', () => {
		const store = createStore({ count: 0 })
		const a = store.value
		const b = store.value
		expect(a).toBe(b)
	})

	test('value returns a fresh snapshot after update', () => {
		const store = createStore({ count: 0 })
		const a = store.value
		store.update((s) => {
			s.count = 1
		})
		expect(store.value).not.toBe(a)
	})

	test('held snapshot is unaffected by later updates', () => {
		const store = createStore({ count: 0, nested: { deep: 1 } })
		const a = store.value
		store.update((s) => {
			s.nested.deep = 999
		})
		expect(a.nested.deep).toBe(1)
	})
})

describe('createStore - functions in state', () => {
	test('nested functions on state do not throw on update', () => {
		const store = createStore({
			items: [1, 2, 3],
			format() { return `[${this.items.join(', ')}]` },
		})
		expect(() => {
			store.update((s) => {
				s.items.push(4)
			})
		}).not.toThrow()
		expect(store.value.items).toEqual([1, 2, 3, 4])
		expect(typeof store.value.format).toBe('function')
	})

	test('functions are shared by reference in snapshots', () => {
		const function_ = () => 42
		const store = createStore({ fn: function_ })
		expect(store.value.fn).toBe(function_)
	})
})

describe('createStore - symbol-keyed properties', () => {
	const brand = Symbol('brand')

	test('symbol-keyed properties survive update + value read', () => {
		type Branded = { value: number, [brand]: 'tag' }
		const initial: Branded = { value: 1, [brand]: 'tag' }
		const store = createStore(initial)

		store.update((s) => {
			s.value = 2
		})
		expect(store.value[brand]).toBe('tag')
		expect(store.value.value).toBe(2)
	})

	test('symbol-keyed properties on array elements survive cloning', () => {
		type Tagged = number[] & { [brand]: 'list' }
		const tagged = [1, 2, 3] as Tagged
		tagged[brand] = 'list'

		const store = createStore({ list: tagged })
		store.update((s) => {
			s.list.push(4)
		})
		expect(store.value.list[brand]).toBe('list')
	})
})

describe('deepClone', () => {
	test('clones plain objects deeply', () => {
		const original = { a: { b: { c: 1 } } }
		const copy = deepClone(original)
		expect(copy).toEqual(original)
		expect(copy).not.toBe(original)
		expect(copy.a).not.toBe(original.a)
	})

	test('clones arrays deeply', () => {
		const original = [[1], [2, [3]]]
		const copy = deepClone(original)
		expect(copy).toEqual(original)
		expect(copy[1]).not.toBe(original[1])
	})

	test('handles cycles without infinite recursion', () => {
		type Node = { name: string, self?: Node }
		const a: Node = { name: 'a' }
		a.self = a
		const copy = deepClone(a)
		expect(copy.name).toBe('a')
		expect(copy.self).toBe(copy)
	})

	test('clones Date by value', () => {
		const d = new Date('2026-01-01T00:00:00.000Z')
		const copy = deepClone({ d })
		expect(copy.d).not.toBe(d)
		expect(copy.d.getTime()).toBe(d.getTime())
	})

	test('clones Map and Set', () => {
		const m = new Map([['k', { v: 1 }]])
		const s = new Set([{ v: 2 }])
		const copy = deepClone({ m, s })
		expect(copy.m).not.toBe(m)
		expect(copy.m.get('k')).not.toBe(m.get('k'))
		expect(copy.m.get('k')).toEqual({ v: 1 })
		expect(copy.s).not.toBe(s)
		expect([...copy.s][0]).toEqual({ v: 2 })
	})

	test('preserves symbol-keyed properties', () => {
		const tag = Symbol('tag')
		const original = { value: 1, [tag]: 'brand' }
		const copy = deepClone(original)
		expect(copy[tag]).toBe('brand')
	})

	test('shares functions by reference', () => {
		const function_ = () => 1
		const copy = deepClone({ fn: function_ })
		expect(copy.fn).toBe(function_)
	})

	test('structurally clones class instances', () => {
		class Thing {
			x = 1
			nested = { count: 0 }
		}
		const t = new Thing()
		const copy = deepClone({ t })
		expect(copy.t).not.toBe(t)
		expect(copy.t).toBeInstanceOf(Thing)
		expect(copy.t.x).toBe(1)
		expect(copy.t.nested).not.toBe(t.nested)
		expect(copy.t.nested.count).toBe(0)
	})

	test('class instance methods stay on the prototype', () => {
		class Greeter {
			greet() { return 'hi' }
		}
		const g = new Greeter()
		const copy = deepClone({ g })
		expect(copy.g.greet()).toBe('hi')
		expect(Object.getPrototypeOf(copy.g)).toBe(Greeter.prototype)
	})

	test('returns primitives as-is', () => {
		expect(deepClone(1)).toBe(1)
		expect(deepClone('x')).toBe('x')
		// eslint-disable-next-line unicorn/no-null
		expect(deepClone(null)).toBe(null)
		expect(deepClone(undefined)).toBe(undefined)
	})
})

describe('deepFreeze', () => {
	test('freezes plain objects deeply', () => {
		const object = deepFreeze({ a: { b: 1 } })
		expect(Object.isFrozen(object)).toBe(true)
		expect(Object.isFrozen(object.a)).toBe(true)
	})

	test('freezes arrays deeply', () => {
		const array = deepFreeze([{ x: 1 }, { x: 2 }])
		expect(Object.isFrozen(array)).toBe(true)
		expect(Object.isFrozen(array[0])).toBe(true)
	})

	test('handles cycles', () => {
		type Node = { name: string, self?: Node }
		const a: Node = { name: 'a' }
		a.self = a
		const frozen = deepFreeze(a)
		expect(Object.isFrozen(frozen)).toBe(true)
	})

	test('freezes class instances and their fields', () => {
		class Thing { x = 1 }
		const t = new Thing()
		deepFreeze({ t })
		expect(Object.isFrozen(t)).toBe(true)
	})

	test('skips Map and Set', () => {
		const m = new Map([['k', 1]])
		const s = new Set([1])
		deepFreeze({ m, s })
		expect(Object.isFrozen(m)).toBe(false)
		expect(Object.isFrozen(s)).toBe(false)
	})
})

describe('hashState - functions and symbol keys', () => {
	test('same function reference hashes the same', () => {
		const function1 = () => 1
		expect(hashState({ a: 1, fn: function1 })).toBe(hashState({ a: 1, fn: function1 }))
	})

	test('different function references hash differently', () => {
		const function1 = () => 1
		const function2 = () => 1 // same body, different reference
		expect(hashState({ a: 1, fn: function1 })).not.toBe(hashState({ a: 1, fn: function2 }))
	})

	test('symbol-keyed properties affect the hash', () => {
		const brand = Symbol('brand')
		const a = hashState({ value: 1, [brand]: 'x' } as Record<string | symbol, unknown>)
		const b = hashState({ value: 1, [brand]: 'y' } as Record<string | symbol, unknown>)
		expect(a).not.toBe(b)
	})
})

describe('hashState — hashedProperties()', () => {
	test('change detection uses only hashedProperties() when present', () => {
		type State = { value: number, cursor: number, hashedProperties(): { value: number } }
		const initial: State = {
			value: 1,
			cursor: 0,
			hashedProperties() { return { value: this.value } },
		}
		const store = createStore(initial)
		const controller = new AbortController()
		const handler = vi.fn()
		store.on('change', controller.signal, handler)

		// Changing cursor only — should NOT trigger change
		store.update((s) => {
			s.cursor = 99
		})
		expect(handler).toHaveBeenCalledTimes(0)

		// Changing value — should trigger change
		store.update((s) => {
			s.value = 2
		})
		expect(handler).toHaveBeenCalledTimes(1)
		controller.abort()
	})
})
