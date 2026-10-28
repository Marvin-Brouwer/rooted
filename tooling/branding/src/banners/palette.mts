import type { TokenKind } from './highlight.mts'

/** The brand colours, see `docs/branding/style-guide.md`. */
export const colours = {
	green: '#2f6b45',
	white: '#ffffff',
	night: '#0d1117',
}

type Palette = Record<TokenKind, string>

/** The code colours on green, also used by the docs site hero. */
export const light: Palette = {
	keyword: '#ffffff',
	string: '#f3d59a',
	function: '#dcf29b',
	type: '#a9d8ff',
	property: '#cfe3d5',
	punctuation: '#9fc4ab',
	plain: '#cfe3d5',
}

const dark: Palette = {
	keyword: '#0d1117',
	string: '#3d2600',
	function: '#2c3a00',
	type: '#0b2a4a',
	property: '#12241a',
	punctuation: '#1c3d29',
	plain: '#0d1117',
}

function rules(palette: Palette, wordmark: string) {
	const tokens = Object.entries(palette).map(([kind, colour]) => `.${kind} { fill: ${colour}; }`)
	return [`.word { fill: ${wordmark}; }`, ...tokens].join(' ')
}

/**
 * The CSS that colours the wordmark and the code.
 * With `darkMode`, it adds a `prefers-color-scheme: dark` block that turns both dark, for pages with a dark background.
 */
export function paletteCss(darkMode: boolean) {
	const base = rules(light, colours.white)
	return darkMode
		? `${base} @media (prefers-color-scheme: dark) { ${rules(dark, colours.night)} }`
		: base
}
