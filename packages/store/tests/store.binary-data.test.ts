import { describe, expect, test, vi } from 'vitest'

import { deepClone } from '../src/deepClone.mts'
import { hashState } from '../src/hash.mts'
import { createStore } from '../src/store.create.mts'

// Reads the bytes a value covers, whatever kind of binary value it is, so the cases below can compare contents.
function bytesOf(value: ArrayBuffer | ArrayBufferView): number[] {
	if (value instanceof ArrayBuffer) return [...new Uint8Array(value)]
	return [...new Uint8Array(value.buffer, value.byteOffset, value.byteLength)]
}

const binaryCases: [string, () => ArrayBuffer | ArrayBufferView][] = [
	['Uint8Array', () => new Uint8Array([1, 2, 3])],
	['Uint8ClampedArray', () => new Uint8ClampedArray([1, 2, 3])],
	['Int16Array', () => new Int16Array([-1, 2, 3])],
	['Float32Array', () => new Float32Array([1.5, 2.5])],
	['Float64Array', () => new Float64Array([1.5, 2.5])],
	['BigUint64Array', () => new BigUint64Array([1n, 2n])],
	['ArrayBuffer', () => new Uint8Array([1, 2, 3]).buffer],
	['DataView', () => new DataView(new Uint8Array([1, 2, 3]).buffer)],
]

describe('createStore — binary data in state', () => {
	test.each(binaryCases)('a %s reads back as a working value with the same bytes', (_name, create) => {
		// Arrange
		const original = create()
		const store = createStore({ data: original })

		// Act
		const { data } = store.value

		// Assert
		expect(data).toBeInstanceOf(original.constructor)
		expect(data.byteLength).toBe(original.byteLength)
		expect(bytesOf(data)).toEqual(bytesOf(original))
	})

	test('a typed array set by update reads back as a working value', () => {
		// Arrange
		const store = createStore<{ file: Uint8Array }>({ file: new Uint8Array([1, 2, 3]) })

		// Act
		store.update(() => ({ file: new Uint8Array([4, 5]) }))

		// Assert
		expect(store.value.file.length).toBe(2)
		expect([...store.value.file]).toEqual([4, 5])
	})

	test('a snapshot keeps its bytes when the live state is written to', () => {
		// Arrange
		const store = createStore({ file: new Uint8Array([1, 2, 3]) })
		const snapshot = store.value

		// Act
		store.update((state) => {
			state.file[0] = 9
		})

		// Assert
		expect([...snapshot.file]).toEqual([1, 2, 3])
		expect([...store.value.file]).toEqual([9, 2, 3])
	})

	test('a snapshot works with platform APIs that need a real typed array', async () => {
		// Arrange
		const store = createStore({ file: new Uint8Array([1, 2, 3]) })

		// Act
		const blob = new Blob([store.value.file])

		// Assert
		expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3])
	})

	test('a snapshot typed array is accepted where a Uint8Array is expected', () => {
		// Arrange
		const store = createStore({ file: new Uint8Array([1, 2, 3]) })
		const sum = (bytes: Uint8Array): number => bytes.reduce((total, byte) => total + byte, 0)

		// Act
		const result = sum(store.value.file)

		// Assert
		expect(result).toBe(6)
	})

	test('a write into a snapshot typed array is a type error but not a runtime one', () => {
		// Arrange
		const store = createStore({ file: new Uint8Array([1, 2, 3]) })

		// Act
		const write = () => {
			// @ts-expect-error the snapshot is readonly, even though the runtime can't enforce it for bytes
			store.value.file[0] = 9
		}

		// Assert
		expect(write).not.toThrow()
	})

	test('change fires when an ArrayBuffer is swapped for one with different bytes', () => {
		// Arrange
		const store = createStore({ buffer: new Uint8Array([1, 2, 3]).buffer })
		const handler = vi.fn()
		const controller = new AbortController()
		store.on('change', controller.signal, handler)

		// Act
		store.update(() => ({ buffer: new Uint8Array([1, 2, 4]).buffer }))

		// Assert
		expect(handler).toHaveBeenCalledTimes(1)
		controller.abort()
	})

	test('change does not fire when an ArrayBuffer is swapped for an equal copy', () => {
		// Arrange
		const store = createStore({ buffer: new Uint8Array([1, 2, 3]).buffer })
		const handler = vi.fn()
		const controller = new AbortController()
		store.on('change', controller.signal, handler)

		// Act
		store.update(() => ({ buffer: new Uint8Array([1, 2, 3]).buffer }))

		// Assert
		expect(handler).not.toHaveBeenCalled()
		controller.abort()
	})

	test('change fires when a single byte of a typed array is written', () => {
		// Arrange
		const store = createStore({ file: new Uint8Array([1, 2, 3]) })
		const handler = vi.fn()
		const controller = new AbortController()
		store.on('change', controller.signal, handler)

		// Act
		store.update((state) => {
			state.file[1] = 7
		})

		// Assert
		expect(handler).toHaveBeenCalledTimes(1)
		controller.abort()
	})
})

describe('deepClone — binary data', () => {
	test('a typed array subclass keeps its prototype', () => {
		// Arrange
		class Bytes extends Uint8Array {}
		const original = new Bytes([1, 2, 3])

		// Act
		const copy = deepClone(original)

		// Assert
		expect(copy).toBeInstanceOf(Bytes)
		expect([...copy]).toEqual([1, 2, 3])
	})

	test('a subarray view is copied as only the bytes it covers', () => {
		// Arrange
		const original = new Uint8Array([1, 2, 3, 4, 5]).subarray(1, 3)

		// Act
		const copy = deepClone(original)

		// Assert
		expect([...copy]).toEqual([2, 3])
		expect(copy.byteOffset).toBe(0)
		expect(copy.buffer.byteLength).toBe(2)
	})

	test('a DataView over part of a buffer is copied as only the bytes it covers', () => {
		// Arrange
		const original = new DataView(new Uint8Array([1, 2, 3, 4, 5]).buffer, 1, 2)

		// Act
		const copy = deepClone(original)

		// Assert
		expect(bytesOf(copy)).toEqual([2, 3])
		expect(copy.buffer.byteLength).toBe(2)
	})

	test('the same view referenced twice clones to a single copy', () => {
		// Arrange
		const bytes = new Uint8Array([1, 2, 3])

		// Act
		const copy = deepClone({ first: bytes, second: bytes })

		// Assert
		expect(copy.first).not.toBe(bytes)
		expect(copy.second).toBe(copy.first)
	})

	test('a buffer reporting itself immutable is shared instead of copied (stubbed, Node 22 has no immutable buffers)', () => {
		// Arrange
		const buffer = new Uint8Array([1, 2, 3]).buffer
		Object.defineProperty(buffer, 'immutable', { get: () => true })

		// Act
		const copy = deepClone(buffer)

		// Assert
		expect(copy).toBe(buffer)
	})

	test('a view over a buffer reporting itself immutable is shared instead of copied (stubbed, Node 22 has no immutable buffers)', () => {
		// Arrange
		const buffer = new Uint8Array([1, 2, 3]).buffer
		Object.defineProperty(buffer, 'immutable', { get: () => true })
		const view = new Uint8Array(buffer)

		// Act
		const copy = deepClone(view)

		// Assert
		expect(copy).toBe(view)
	})
})

describe('hashState — binary data', () => {
	test('typed arrays of different types with the same bytes hash differently', () => {
		// Arrange
		const unsigned = new Uint8Array([1, 2, 3])
		const signed = new Int8Array([1, 2, 3])

		// Act
		const hashes = [hashState({ data: unsigned }), hashState({ data: signed })]

		// Assert
		expect(hashes[0]).not.toBe(hashes[1])
	})

	test('a view hashes only the bytes it covers', () => {
		// Arrange
		const whole = new Uint8Array([2, 3])
		const view = new Uint8Array([1, 2, 3, 4]).subarray(1, 3)

		// Act
		const hashes = [hashState({ data: whole }), hashState({ data: view })]

		// Assert
		expect(hashes[0]).toBe(hashes[1])
	})
})
