type StripAria<S extends string> = S extends `aria${infer Rest}` ? Uncapitalize<Rest> : S

type AriaStringProperties = {
	[P in keyof ARIAMixin as ARIAMixin[P] extends string | null ? StripAria<string & P> : never]?: string | null
}

// Properties that only exist as Element[] in ARIAMixin. Accepts a string ID or an Element directly.
type AriaIdReferenceProperties = {
	/** {@inheritdoc ARIAMixin['ariaActiveDescendantElement']} */
	activeDescendant?: string | Element | null
	/** {@inheritdoc ARIAMixin['ariaControlsElements']} */
	controls?: string | Element | null
	/** {@inheritdoc ARIAMixin['ariaDescribedByElements']} */
	describedBy?: string | Element | null
	/** {@inheritdoc ARIAMixin['ariaDetailsElements']} */
	details?: string | Element | null
	/** {@inheritdoc ARIAMixin['ariaErrorMessageElements']} */
	errorMessage?: string | Element | null
	/** {@inheritdoc ARIAMixin['ariaFlowToElements']} */
	flowTo?: string | Element | null
	/** {@inheritdoc ARIAMixin['ariaLabelledByElements']} */
	labelledBy?: string | Element | null
	/** {@inheritdoc ARIAMixin['ariaOwnsElements']} */
	owns?: string | Element | null
}

/**
 * Shape of the `aria` prop on `element(...)`. Accepts every ARIA attribute
 * defined on `ARIAMixin`, with the `aria` prefix stripped (so `aria-label`
 * becomes `label`, `aria-describedby` becomes `describedBy`).
 *
 * For ID-reference attributes (`aria-labelledby`, `aria-controls`, etc.) the
 * value can be a string ID or an `Element` reference. Element references are
 * set via the IDL reflection property when supported, falling back to the
 * attribute value otherwise.
 *
 * @example
 * ```ts
 * element('button', {
 *   aria: {
 *     label: 'Save',
 *     describedBy: helpTextElement,
 *     pressed: 'false',
 *   },
 * })
 * ```
 */
export type Aria = AriaStringProperties & AriaIdReferenceProperties

const ariaIdReferenceAttributes: Record<keyof AriaIdReferenceProperties, string> = {
	activeDescendant: 'aria-activedescendant',
	controls: 'aria-controls',
	describedBy: 'aria-describedby',
	details: 'aria-details',
	errorMessage: 'aria-errormessage',
	flowTo: 'aria-flowto',
	labelledBy: 'aria-labelledby',
	owns: 'aria-owns',
}

// ariaActiveDescendantElement is singular; the rest take Element[]
const ariaIdReferenceElementProperties: Record<keyof AriaIdReferenceProperties, string> = {
	activeDescendant: 'ariaActiveDescendantElement',
	controls: 'ariaControlsElements',
	describedBy: 'ariaDescribedByElements',
	details: 'ariaDetailsElements',
	errorMessage: 'ariaErrorMessageElements',
	flowTo: 'ariaFlowToElements',
	labelledBy: 'ariaLabelledByElements',
	owns: 'ariaOwnsElements',
}

function setProperty(element: Element, key: string, value: unknown): void {
	(element as unknown as Record<string, unknown>)[key] = value
}

export function buildAriaProperties(aria: Aria | undefined, element: Element): void {
	if (!aria) return
	for (const [key, value] of Object.entries(aria)) {
		if (!(key in ariaIdReferenceAttributes)) {
			const domKey = `aria${key[0].toUpperCase()}${key.slice(1)}`
			setProperty(element, domKey, value)
			continue
		}
		if (value === null || value === undefined) {
			element.removeAttribute(ariaIdReferenceAttributes[key as keyof AriaIdReferenceProperties])
			continue
		}
		if (value instanceof Element) {
			const idlKey = ariaIdReferenceElementProperties[key as keyof AriaIdReferenceProperties]
			setProperty(element, idlKey, idlKey.endsWith('Elements') ? [value] : value)
			continue
		}
		element.setAttribute(ariaIdReferenceAttributes[key as keyof AriaIdReferenceProperties], value)
	}
}
