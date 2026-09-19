/**
 * Returns `matched` when `condition` is `true`, otherwise `notMatched`.
 *
 * The two sided version of `optional()`, for when both branches have a value.
 * The condition comes first, same as `optional()` and `cssClass()`, and only
 * `true` counts as a match.
 *
 * Both values are evaluated before `choice` runs, a ternary only evaluates the
 * branch it takes. So this isn't a drop-in ternary replacement: keep the
 * ternary when a branch reads through something that might not be there, or
 * does work you'd rather skip.
 *
 * @param condition - When `true` the matched value is returned, any other
 *   value returns `notMatched`.
 * @param matched - The value to return when the condition holds.
 * @param notMatched - The value to return when it doesn't.
 *
 * @example
 * ```ts
 * element('button', {
 *   tabIndex: choice(selected, 0, -1),
 *   aria: {
 *     selected: choice(selected, 'true', 'false'),
 *   },
 * })
 * ```
 *
 * @example
 * The two values don't have to be the same type, the result is the union of
 * both. `choice(selected, 'page', undefined)` gives back `'page' | undefined`.
 * Passing a single type argument still works, `notMatched` falls back to the
 * type of `matched`:
 * ```ts
 * const label = choice<string>(locked, 'Locked', 'Unlocked')
 * ```
 */
export function choice<TMatched, TNotMatched = TMatched>(
	condition: boolean | null | undefined,
	matched: TMatched,
	notMatched: TNotMatched,
): TMatched | TNotMatched {
	if (condition !== true) return notMatched
	return matched
}
