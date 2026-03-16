
/**
 * A single CSS class value. Falsy variants (`undefined` and `null`) are
 * automatically filtered out when building a class list, so conditional
 * classes can be expressed without explicit guards.
 */
export type CssClass = string | undefined | null

/**
 * One or more CSS class values accepted by the `classes` prop of every HTML
 * element created via `create()` or `append()`.
 *
 * - A single string is used as-is.
 * - An array of {@link CssClass} values is joined with spaces after falsy
 *   entries are removed.
 *
 * @see {@link cssClass} for composing conditional class names.
 */
export type CssClasses = Array<CssClass> | CssClass

/**
 * Returns `className` when `visible` is truthy, otherwise `undefined`.
 *
 * Designed to compose cleanly with {@link CssClasses}: falsy values are
 * filtered out automatically, so static and conditional classes can be mixed
 * in a single array without branching.
 *
 * @param className - The CSS class to apply.
 * @param visible - When `true` (the default) the class is returned; any other
 *   value produces `undefined`.
 *
 * @example
 * ```ts
 * append('button', {
 *   classes: [
 *     'btn',
 *     cssClass('btn--active', isActive),
 *     cssClass('btn--disabled', isDisabled),
 *   ],
 * })
 * ```
 */
export function cssClass(className: string, visible: boolean | null | undefined = true) {
	if (visible !== true) return undefined
	return className as CssClass
}