/**
 * A key {@link match} can look up. Records are keyed by string or number, and
 * the array form is keyed by index.
 */
export type MatchKey = string | number

/**
 * Picks one of several values by key or by index, instead of chaining ternaries
 * or writing a `switch` that only assigns a variable.
 *
 * Two ways to call it:
 *
 * - `match(key, { draft: 'a', published: 'b' })` looks the key up in a record.
 *   The record has to cover every key the type allows, so adding a case to the
 *   union breaks the build until you handle it, and the result is never
 *   `undefined`.
 * - `match(index, ['a', 'b'])` reads an index out of an array. An index out of
 *   range gives `undefined`, and the signature says so.
 *
 * Two things to watch:
 *
 * - The exhaustiveness only works when the key is a union of literals. A key
 *   typed as plain `string` or `number` can't be exhausted, so a partial record
 *   type-checks and hands you `undefined` where the type promises a value. If
 *   you narrowed the key all the way down to one literal, annotate it with the
 *   full union, otherwise the other entries in the record are read as excess
 *   properties.
 * - Every value in the record or array is evaluated before `match` runs, where
 *   a `switch` only runs the branch it takes. Keep the `switch` when the
 *   branches do real work.
 *
 * @param key - The key to look up, or the index to read.
 * @param options - The record to look the key up in, or the array to index.
 *
 * @example
 * ```ts
 * type Status = 'draft' | 'review' | 'published'
 *
 * element('p', {
 *   textContent: match(status, {
 *     draft: 'Not shared yet',
 *     review: 'Waiting on a reviewer',
 *     published: 'Live',
 *   }),
 * })
 * ```
 *
 * @example
 * By index, for things that are already numbered:
 * ```ts
 * const ordinal = match(place, ['first', 'second', 'third'])
 * ```
 */
export function match<TValue>(index: number, options: ReadonlyArray<TValue>): TValue | undefined
export function match<TKey extends MatchKey, TValue>(key: TKey, options: Readonly<Record<TKey, TValue>>): TValue
export function match<TValue>(
	key: MatchKey,
	options: ReadonlyArray<TValue> | Readonly<Record<MatchKey, TValue>>,
): TValue | undefined {
	// Array.isArray doesn't narrow a ReadonlyArray out of the union, so both branches need a cast.
	if (Array.isArray(options)) return (options as ReadonlyArray<TValue>)[key as number]
	return (options as Readonly<Record<MatchKey, TValue>>)[key]
}
