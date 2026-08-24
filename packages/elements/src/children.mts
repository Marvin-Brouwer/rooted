/**
 * A single child of an element: a `Node` or a string of text. `undefined` and
 * `null` are allowed too, and get skipped when the children are appended, so
 * conditional children don't need a guard.
 */
export type ElementChild = Node | string | undefined | null

/**
 * One or more children accepted by the `children` prop of every element
 * created via `element()`, `create()` or `append()`.
 *
 * - A single `Node` or string is appended as-is.
 * - An array is appended in order, skipping `undefined` and `null` entries.
 *
 * Because those entries are skipped, conditional children can be written
 * inline with `optional()`. A plain ternary ending in `undefined` works too,
 * it just reads worse.
 *
 * @example
 * ```ts
 * import { optional } from '@rooted/components'
 *
 * element('label', {
 *   children: [
 *     element('span', {
 *       textContent: 'Name',
 *     }),
 *     optional(required,
 *       element('abbr', {
 *         title: 'required',
 *         textContent: '*',
 *       })
 *     ),
 *   ],
 * })
 * ```
 */
export type ElementChildren = Array<ElementChild> | ElementChild
