import { isThenable } from '@rooted/util'

import { isBinaryData } from './binary-data.mts'
import { Immutable } from './immutable.mts'

const referenceIdentities = new WeakMap<object, number>()
let nextReferenceIdentity = 0

// Functions and promises can't be serialised, but they have identity. Give each reference a stable id so the same one hashes the same and a different one changes the hash. The ids come from a single counter; nothing reads them apart from the comparison between two hashes.
function referenceIdentity(value: object, kind: string): string {
	let id = referenceIdentities.get(value)
	if (id === undefined) {
		id = ++nextReferenceIdentity
		referenceIdentities.set(value, id)
	}
	return `[${kind}#${id}]`
}

const hexDigits = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0'))

// JSON.stringify can't see bytes: an ArrayBuffer comes out as `{}`, so swapping one for another looks like no change, and a typed array comes out as an object with a key per index. Write out the bytes the value covers as hex instead. The type name goes in front so the same bytes in a different type still count as a change.
function hashBinaryData(value: ArrayBuffer | ArrayBufferView): string {
	const bytes = value instanceof ArrayBuffer
		? new Uint8Array(value)
		: new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
	let hex = ''
	for (const byte of bytes) hex += hexDigits[byte]
	return `[${value.constructor.name}:${hex}]`
}

function hashReplacer(_key: string, value: unknown): unknown {
	// eslint-disable-next-line unicorn/no-null
	if (value === null) return value
	if (value === undefined) return value
	if (typeof value === 'function') return referenceIdentity(value, 'Function')
	if (isThenable(value)) return referenceIdentity(value, 'Promise')
	if (typeof value === 'bigint') return value.toString()
	if (value instanceof Date) return value.toISOString()
	// Skipping the contents is what Immutable is for, so it goes by the identity of the value inside.
	if (value instanceof Immutable) return referenceIdentity(value.value as object, 'Immutable')
	if (typeof value === 'object' && isBinaryData(value)) return hashBinaryData(value)
	if (Array.isArray(value)) return value
	if (typeof value === 'object') {
		// If the object declares hashedProperties(), hash only that subset
		const hashable = value as { hashedProperties?(): Record<string, unknown> }
		if (typeof hashable.hashedProperties === 'function') {
			const target = hashable.hashedProperties()
			return Object.fromEntries(
				Object.entries(target).toSorted(([a], [b]) => a.localeCompare(b)),
			)
		}
		// Include symbol-keyed properties (JSON.stringify drops them otherwise) and sort keys for stable output.
		const target = value as Record<string | symbol, unknown>
		const entries: [string, unknown][] = []
		for (const key of Reflect.ownKeys(target)) {
			entries.push([
				typeof key === 'symbol' ? key.toString() : key,
				target[key as string],
			])
		}
		entries.sort(([a], [b]) => a.localeCompare(b))
		return Object.fromEntries(entries)
	}
	return value
}

export function hashState(state: unknown): string {
	if (state === undefined) return 'undefined'
	return JSON.stringify(state, hashReplacer) ?? 'undefined'
}
