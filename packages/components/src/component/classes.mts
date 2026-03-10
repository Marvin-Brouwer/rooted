
/** @todo write documentation */
export type CssClass = string | undefined | null
/** @todo write documentation */
export type CssClasses = Array<CssClass> | CssClass

/** @todo write documentation */
export function cssClass(className: string, visible: boolean | null | undefined = true) {
	if (visible !== true) return undefined
	return className as CssClass
}