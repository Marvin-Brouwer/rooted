/**
 * Returns `matched` when `condition` is `true`, otherwise `notMatched`.
 *
 * The two sided version of `optional()`, for picking between two values you already have. The condition comes first,
 * same as `optional()` and `cssClass()`, and only `true` counts as a match.
 *
 * Both values get evaluated, because that's what passing arguments to a function does, and no amount of typing changes it.
 * A branch that has to compute something, or that reads through something which might not be there,
 * is a ternary's job and stays one.
 *
 * @param condition - When `true` the matched value is returned, any other
 *   value returns `notMatched`.
 * @param matched - The value to return when the condition holds.
 * @param notMatched - The value to return when it doesn't.
 *
 * @example
 * ```ts
 * element('button', {
 *   tabIndex: choice(selected,
 *     0,
 *     -1
 *   ),
 *   aria: {
 *     selected: choice(selected,
 *       'true',
 *       'false'
 *     ),
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
 * const label = choice<string>(locked,
 *   'Locked',
 *   'Unlocked'
 * )
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
