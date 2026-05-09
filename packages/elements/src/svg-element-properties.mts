import { ElementOnHandlers } from '@rooted/events'

import { type Aria } from './aria.mts'
import { CssClasses } from './classes.mts'
import { FunctionKeys, InlineStyle, NonWritableKeys, OnHandlerKeys } from './element-type-utilities.mts'

/**
 * Tag names accepted by `element(...)` for SVG. Use `'svg'` for the root
 * element and `'svg:<name>'` for the rest. The prefix avoids collisions with
 * same-named HTML tags (`a`, `title`, etc.).
 */
export type SvgTagName = 'svg' | `svg:${Exclude<keyof SVGElementTagNameMap, 'svg'>}`

/** Maps a {@link SvgTagName} back to the concrete SVG element class. */
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

/**
 * Typed properties for the SVG element with tag `K`. Returned as the second
 * argument to `element(tag, props)` for SVG tags. Unknown keys fall through
 * to `setAttribute`, so SVG-specific attributes (`viewBox`, `d`, `href`)
 * work without special-casing.
 */
export type SvgElementProperties<K extends SvgTagName>
	= SvgElementPropertiesMapped<SvgTagElement<K> & SVGElement>
