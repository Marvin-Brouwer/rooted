const functionIdentities = new WeakMap<Function, number>()
let nextFunctionIdentity = 0

// Functions can't be serialised, but they have identity. Give each function reference a stable id so the same function hashes the same and a different function reference changes the hash.
function functionIdentity(value: Function): string {
	let id = functionIdentities.get(value)
	if (id === undefined) {
		id = ++nextFunctionIdentity
		functionIdentities.set(value, id)
	}
	return `[Function#${id}]`
}

function hashReplacer(_key: string, value: unknown): unknown {
	// eslint-disable-next-line unicorn/no-null
	if (value === null) return value
	if (value === undefined) return value
	if (typeof value === 'function') return functionIdentity(value)
	if (typeof value === 'bigint') return value.toString()
	if (value instanceof Date) return value.toISOString()
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
