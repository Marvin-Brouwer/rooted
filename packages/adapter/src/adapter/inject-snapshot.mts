/**
 * Replaces the content of `<div id="app">` in `html` with `snapshot`.
 * The snapshot is inserted verbatim without HTML parsing.
 */
export function injectSnapshot(html: string, snapshot: string): string {
	const open = '<div id="app">'
	const start = html.indexOf(open)
	if (start === -1) return html
	const contentStart = start + open.length
	const end = html.indexOf('</div>', contentStart)
	if (end === -1) return html
	return html.slice(0, contentStart) + snapshot + html.slice(end)
}
