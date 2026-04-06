import { describe, expect, test, vi } from 'vitest'

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

	test('currentValue is a structuredClone — mutations do not bleed into each other', () => {
		const store = createStore({ items: [1, 2, 3] })
		store.update((s) => {
			s.items.push(4)
		})
		// A second update should still get the post-first-update state
		store.update((s) => {
			expect(s.items).toEqual([1, 2, 3, 4])
		})
	})

	test('mutations to currentValue after setter returns do not affect stored state', () => {
		const store = createStore({ count: 0 })
		let captured: { count: number } | undefined
		store.update((s) => {
			captured = s
		})
		captured!.count = 999
		expect(store.value.count).toBe(0)
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
