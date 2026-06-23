function hashReplacer(_key: string, value: unknown): unknown {
	// eslint-disable-next-line unicorn/no-null
	if (value === null) return value
	if (value === undefined) return value
	// Functions are identity-only and can't be hashed. Drop them.
	if (typeof value === 'function') return undefined
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
		// Include symbol-keyed properties (JSON.stringify drops them otherwise)
		// and skip function values. Sort keys for stable output.
		const target = value as Record<string | symbol, unknown>
		const entries: [string, unknown][] = []
		for (const key of Reflect.ownKeys(target)) {
			const v = target[key as string]
			if (typeof v === 'function') continue
			entries.push([typeof key === 'symbol' ? key.toString() : key, v])
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
