import { codeExample } from './code-example.mts'
import { codeFont, outline } from './fonts.mts'
import { highlight } from './highlight.mts'

/** Columns per tab. The code is drawn, not typeset, so this is the only place tab width exists. */
const tabWidth = 2

type CodeBlockOptions = {
	/** Left edge of the code. */
	x: number
	/** Baseline of the first line. */
	y: number
	/** Font size in pixels. */
	size: number
	/** Distance between baselines, as a multiple of `size`. */
	lineHeight: number
}

/**
 * The code example as outlined, coloured glyphs.
 *
 * Every character used is defined once in `definitions` and placed with `<use>`, so the result doesn't depend on fonts being available where it's shown.
 * Tokens are grouped under their kind's class name (`keyword`, `string`, ...), which is what `paletteCss` colours.
 *
 * @example
 * ```ts
 * const code = codeBlock({ x: 32, y: 47, size: 15, lineHeight: 1.45 })
 * const svg = `<svg ...><defs>${code.definitions}</defs>${code.markup}</svg>`
 * ```
 */
export function codeBlock({ x, y, size, lineHeight }: CodeBlockOptions) {
	const scale = size / codeFont.unitsPerEm
	const advance = codeFont.glyphForCodePoint(' '.codePointAt(0)!).advanceWidth
	const glyphs = new Map<string, string>()

	const lines = codeExample.trimEnd().split('\n').map((line, index) => {
		let column = 0
		const tokens = highlight(line.replaceAll('\t', ' '.repeat(tabWidth))).map((token) => {
			const uses = [...token.text].map((character) => {
				const left = column++ * advance
				const data = outline(codeFont, character)
				if (data === undefined) return ''

				const id = `glyph-${character.codePointAt(0)}`
				glyphs.set(id, data)
				return `<use href="#${id}" x="${left}"/>`
			})
			return uses.some(Boolean) ? `<g class="${token.kind}">${uses.join('')}</g>` : ''
		})

		const baseline = y + index * size * lineHeight
		return `<g transform="translate(${x} ${baseline}) scale(${scale} ${-scale})">${tokens.join('')}</g>`
	})

	return {
		definitions: [...glyphs].map(([id, data]) => `<path id="${id}" d="${data}"/>`).join(''),
		markup: `<g class="code">${lines.join('')}</g>`,
	}
}
