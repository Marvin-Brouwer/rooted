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
		children?: Array<Node | string> | Node | string
		classes?: CssClasses
		style?: InlineStyle
		aria?: Aria
		on?: ElementOnHandlers<TElement>
	}

export type HtmlElementProperties<KElement extends keyof HTMLElementTagNameMap>
	= HtmlElementPropertiesMapped<HTMLElementTagNameMap[KElement]>
