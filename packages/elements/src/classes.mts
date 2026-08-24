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
 * Class names mapped to whether they apply. Only `true` includes the class,
 * anything else leaves it out.
 *
 * Keys have to be strings, so this doesn't work with a `CssModule` value that
 * TypeScript thinks might be `undefined`. Use the list form of
 * {@link cssClasses} for those.
 *
 * @see {@link cssClasses} for the function that reads this.
 */
export type CssClassDictionary = Record<string, boolean | null | undefined>

/**
 * Returns `className` when `visible` is `true`, otherwise `undefined`.
 *
 * Designed to compose cleanly with {@link CssClasses}: falsy values are
 * filtered out automatically, so static and conditional classes can be mixed
 * in a single array without branching. Called with just a class name it
 * returns that name, which is handy when the rest of the array is conditional.
 *
 * The condition comes first, same as `optional()`.
 *
 * @param visible - When `true` the class is returned, any other value produces
 *   `undefined`.
 * @param className - The CSS class to apply.
 *
 * @example
 * ```ts
 * append('button', {
 *   classes: [
 *     'btn',
 *     cssClass(isActive, 'btn--active'),
 *     cssClass(isDisabled, 'btn--disabled'),
 *   ],
 * })
 * ```
 */
export function cssClass(className: CssClass): CssClass
export function cssClass(visible: boolean | null | undefined, className: CssClass): CssClass
export function cssClass(...arguments_: [CssClass] | [boolean | null | undefined, CssClass]): CssClass {
	if (arguments_.length === 1) return arguments_[0]

	const [visible, className] = arguments_
	if (visible !== true) return
	return className
}

/**
 * Joins several class names into one {@link CssClass}, dropping the falsy
 * ones. Returns `undefined` when nothing is left, so the result disappears
 * from a `classes` array instead of adding an empty string.
 *
 * Three ways to call it:
 *
 * - `cssClasses('a', 'b')` joins what you pass.
 * - `cssClasses(visible, 'a', 'b')` joins them only when `visible` is `true`.
 * - `cssClasses({ a: true, b: false })` keeps the keys mapped to `true`.
 *
 * Watch out for one overlap: a leading `undefined` or `null` is read as the
 * condition, so `cssClasses(undefined, 'a')` is `undefined` and not `'a'`.
 * A class name that might be `undefined`, like anything off a `CssModule`,
 * belongs after the condition rather than first.
 *
 * @example
 * ```ts
 * append('button', {
 *   classes: [
 *     cssClasses(styles.button, styles.rounded),
 *     cssClasses(isActive, styles.active, styles.raised),
 *     cssClasses({
 *       'btn--disabled': isDisabled,
 *     }),
 *   ],
 * })
 * ```
 */
export function cssClasses(visible: boolean | null | undefined, ...classNames: Array<CssClass>): CssClass
export function cssClasses(...classNames: Array<CssClass>): CssClass
export function cssClasses(classNames: CssClassDictionary): CssClass
export function cssClasses(
	...arguments_: [CssClassDictionary] | [boolean | null | undefined, ...Array<CssClass>] | Array<CssClass>
): CssClass {
	const [first, ...rest] = arguments_

	if (typeof first === 'string') return joinClassNames([first, ...rest] as Array<CssClass>)

	if (first === undefined || first === null || typeof first === 'boolean') {
		if (first !== true) return
		return joinClassNames(rest as Array<CssClass>)
	}

	return joinClassNames(Object
		.entries(first)
		.filter(([, visible]) => visible === true)
		.map(([className]) => className))
}

function joinClassNames(classNames: Array<CssClass>): CssClass {
	const className = classNames.filter(Boolean).join(' ')
	if (!className) return
	return className
}
