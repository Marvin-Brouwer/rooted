import { createRequire } from 'node:module'
import path from 'node:path'

import * as fontkit from 'fontkit'

const require = createRequire(import.meta.url)

function open(file: string) {
	return fontkit.openSync(file) as fontkit.Font
}

/** Inter Display Black, the typeface of the `rooted` wordmark. */
export const wordmarkFont = open(path.join(
	path.dirname(require.resolve('inter-ui')),
	'display-latin/InterDisplay-Black-subset.woff2',
))

/** JetBrains Mono Regular, the typeface of the code example. */
export const codeFont = open(path.join(
	path.dirname(require.resolve('@fontsource/jetbrains-mono/package.json')),
	'files/jetbrains-mono-latin-400-normal.woff2',
))

/**
 * The outline of a character as SVG path data, in font units with the y axis pointing up.
 * Characters without an outline (a space, or anything the font doesn't cover) give `undefined`.
 */
export function outline(font: fontkit.Font, character: string) {
	const codePoint = character.codePointAt(0)
	if (codePoint === undefined || !font.hasGlyphForCodePoint(codePoint)) return undefined

	const data = font.glyphForCodePoint(codePoint).path.toSVG()
	return data === '' ? undefined : data
}
