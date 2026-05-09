import { ElementOnHandlers } from '@rooted/events'

import { type Aria } from './aria.mts'
import { CssClasses } from './classes.mts'
import { FunctionKeys, InlineStyle, NonWritableKeys, OnHandlerKeys } from './element-type-utilities.mts'

type SanitizedHtmlProperties<TElement extends HTMLElement> = Omit<
	TElement,
	| NonWritableKeys<TElement>
	| FunctionKeys<TElement>
	| Exclude<keyof ARIAMixin, 'role'>
	| OnHandlerKeys<TElement>
	| 'children' | 'className' | 'classList' | 'style'
>

type HtmlElementPropertiesMapped<TElement extends HTMLElement>
	= Partial<SanitizedHtmlProperties<TElement>>
	& {
		// allows non-DOM attributes (data-*, aria-*, custom attributes like og property) as string/number fallbacks
		[key: string]: unknown
		children?: Array<Node | string> | Node | string
		classes?: CssClasses
		style?: InlineStyle
		aria?: Aria
		on?: ElementOnHandlers<TElement>
	}

/**
 * Typed properties for the HTML element with tag `KElement`. Returned as the
 * second argument to `element(tag, props)` for HTML tags.
 *
 * Includes the writable DOM properties of the element, plus rooted's own
 * `classes`, `style`, `aria`, `on`, and `children` shorthands. Unknown keys
 * (`data-*`, custom attributes) fall through as strings.
 */
export type HtmlElementProperties<KElement extends keyof HTMLElementTagNameMap>
	= HtmlElementPropertiesMapped<HTMLElementTagNameMap[KElement]>
