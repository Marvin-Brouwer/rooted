import { wordmarkFont } from './fonts.mts'

/** Space between letters, in font units. Negative, the wordmark is set tight. */
const tracking = -20

/**
 * The `rooted` wordmark as SVG markup, scaled to `width` with its ink box starting at (0, 0).
 *
 * Letters are spaced by their ink, not their advance width, so the gaps between them are even.
 * The paths have no fill: colour them through the `word` class.
 *
 * @example
 * ```ts
 * const { markup, height } = wordmark(300)
 * ```
 */
export function wordmark(width: number) {
	const glyphs = [...'rooted'].map(character => wordmarkFont.glyphForCodePoint(character.codePointAt(0)!))

	let x = 0
	const placed = glyphs.map((glyph) => {
		const offset = x - glyph.bbox.minX
		x += glyph.bbox.maxX - glyph.bbox.minX + tracking
		return { glyph, offset }
	})

	const inkWidth = x - tracking
	const top = Math.max(...glyphs.map(glyph => glyph.bbox.maxY))
	const bottom = Math.min(...glyphs.map(glyph => glyph.bbox.minY))
	const scale = width / inkWidth

	const paths = placed
		.map(({ glyph, offset }) => `<path transform="translate(${offset} ${top}) scale(1 -1)" d="${glyph.path.toSVG()}"/>`)
		.join('')

	return {
		markup: `<g class="word" transform="scale(${round(scale)})">${paths}</g>`,
		width,
		height: (top - bottom) * scale,
	}
}

function round(value: number) {
	return Number(value.toFixed(5))
}
