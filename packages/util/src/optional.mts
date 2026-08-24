/**
 * Returns `value` when `condition` is `true`, otherwise `undefined`.
 *
 * Handy for building arrays that mix fixed and conditional entries without a
 * ternary. Anything that filters out `undefined` works, like the `children`
 * array of `element(...)` or a plain `.filter(Boolean)`.
 *
 * @param condition - When `true` the value is returned, any other value
 *   produces `undefined`.
 * @param value - The value to include.
 *
 * @example
 * ```ts
 * element('div', {
 *   children: [
 *     element('span', {
 *       textContent: 'a',
 *     }),
 *     optional(selected,
 *       element('span', {
 *         classes: styles.optionCheck,
 *         innerHTML: check,
 *       })
 *     ),
 *   ],
 * })
 * ```
 */
export function optional<T>(condition: boolean | null | undefined, value: T): T | undefined {
	if (condition !== true) return
	return value
}
