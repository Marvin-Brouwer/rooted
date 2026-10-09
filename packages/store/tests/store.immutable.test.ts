import { describe, expect, test, vi } from 'vitest'

import { deepClone } from '../src/deepClone.mts'
import { immutable } from '../src/immutable.mts'
import { createStore } from '../src/store.create.mts'

describe('immutable', () => {
	test('deep-freezes the value it wraps, in place', () => {
		// Arrange
		const table = { entries: [{ id: 1 }] }

		// Act
		immutable(table)

		// Assert
		expect(Object.isFrozen(table)).toBe(true)
		expect(Object.isFrozen(table.entries[0])).toBe(true)
	})

	test('blocks mutating methods on a wrapped Map', () => {
		// Arrange
		const lookup = new Map([['a', 1]])
		immutable(lookup)

		// Act
		const write = () => lookup.set('b', 2)

		// Assert
		expect(write).toThrow(TypeError)
	})

	test('wraps a typed array without copying it', () => {
		// Arrange
		const bytes = new Uint8Array([1, 2, 3])

		// Act
		const wrapped = immutable(bytes)

		// Assert
		expect(wrapped.value).toBe(bytes)
	})

	test('a write into the wrapped value is a type error', () => {
		// Arrange
		const wrapped = immutable({ count: 1 })

		// Act
		const write = () => {
			// @ts-expect-error the wrapped value is readonly
			wrapped.value.count = 2
		}

		// Assert
		expect(write).toThrow(TypeError)
	})

	test('deepClone hands back the wrapper itself', () => {
		// Arrange
		const wrapped = immutable(new Uint8Array([1, 2, 3]))

		// Act
		const copy = deepClone({ file: wrapped })

		// Assert
		expect(copy.file).toBe(wrapped)
	})
})

describe('createStore — immutable values in state', () => {
	test('snapshots share the wrapped value instead of copying it', () => {
		// Arrange
		const bytes = new Uint8Array([1, 2, 3])
		const store = createStore({ title: 'Kana', file: immutable(bytes) })

		// Act
		store.update((state) => {
			state.title = 'Kanji'
		})

		// Assert
		expect(store.value.file.value).toBe(bytes)
	})

	test('change does not fire when the same value is wrapped again', () => {
		// Arrange
		const bytes = new Uint8Array([1, 2, 3])
		const store = createStore({ file: immutable(bytes) })
		const handler = vi.fn()
		const controller = new AbortController()
		store.on('change', controller.signal, handler)

		// Act
		store.update(() => ({ file: immutable(bytes) }))

		// Assert
		expect(handler).not.toHaveBeenCalled()
		controller.abort()
	})

	test('change fires when a different value is wrapped, even with the same contents', () => {
		// Arrange
		const store = createStore({ file: immutable(new Uint8Array([1, 2, 3])) })
		const handler = vi.fn()
		const controller = new AbortController()
		store.on('change', controller.signal, handler)

		// Act
		store.update(() => ({ file: immutable(new Uint8Array([1, 2, 3])) }))

		// Assert
		expect(handler).toHaveBeenCalledTimes(1)
		controller.abort()
	})

	test('an immutable value can be the whole state', () => {
		// Arrange
		const bytes = new Uint8Array([1, 2, 3])
		const store = createStore(immutable(new Uint8Array([0])))

		// Act
		store.update(() => immutable(bytes))

		// Assert
		expect(store.value.value).toBe(bytes)
	})
})
