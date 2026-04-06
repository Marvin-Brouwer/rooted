function hashReplacer(_key: string, value: unknown): unknown {
	if (value === null) return value
	if (value === undefined) return value
	if (typeof value === 'bigint') return value.toString()
	if (value instanceof Date) return value.toISOString()
	if (Array.isArray(value)) return value
	if (typeof value === 'object') {
		// If the object declares hashedProperties(), hash only that subset
		const hashable = value as { hashedProperties?(): Record<string, unknown> }
		const target = typeof hashable.hashedProperties === 'function'
			? hashable.hashedProperties()
			: value as Record<string, unknown>
		// Return a new object with keys in sorted order so JSON.stringify
		// produces a stable string regardless of original insertion order
		return Object.fromEntries(
			Object.entries(target).sort(([a], [b]) => a.localeCompare(b)),
		)
	}
	return value
}

export function hashState(state: unknown): string {
	return JSON.stringify(state, hashReplacer)
}
