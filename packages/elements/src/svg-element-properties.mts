import { ElementOnHandlers } from '@rooted/events'

import { type Aria } from './aria.mts'
import { CssClasses } from './classes.mts'
import { FunctionKeys, InlineStyle, NonWritableKeys, OnHandlerKeys } from './element-type-utilities.mts'

export type SvgTagName = 'svg' | `svg:${Exclude<keyof SVGElementTagNameMap, 'svg'>}`

export type SvgTagElement<T extends SvgTagName>
	= T extends 'svg' ? SVGSVGElement
	: T extends `svg:${infer K extends keyof SVGElementTagNameMap}` ? SVGElementTagNameMap[K]
	: never

type SanitizedSvgProperties<TElement extends SVGElement> = Omit<
	TElement,
	| NonWritableKeys<TElement>
	| FunctionKeys<TElement>
	| Exclude<keyof ARIAMixin, 'role'>
	| OnHandlerKeys<TElement>
	| 'children' | 'className' | 'classList' | 'style'
>

type SvgElementPropertiesMapped<TElement extends SVGElement>
	= Partial<SanitizedSvgProperties<TElement>>
	& {
		// allows SVG-specific attributes (viewBox, href, d, etc.) as string/number fallbacks
		[key: string]: unknown
		classes?: CssClasses
		style?: InlineStyle
		children?: Array<Node | string> | Node | string
		aria?: Aria
		on?: ElementOnHandlers<TElement>
	}

export type SvgElementProperties<K extends SvgTagName>
	= SvgElementPropertiesMapped<SvgTagElement<K> & SVGElement>
