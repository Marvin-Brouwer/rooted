/**
 * Builds a `_redirects` file for the hosts that read Netlify's format:
 * Netlify itself, Cloudflare Pages and GitLab Pages.
 *
 * It writes one `200` rule per dynamic route pattern and nothing else. There is
 * deliberately no catch-all: all three hosts serve a top-level `404.html` with
 * a real `404` for anything that doesn't resolve, and a `/*  /404.html  200`
 * line would override that with a soft 404 on every typo and every scanner
 * probe.
 *
 * `:param` becomes a placeholder, which all three match against a single
 * non-empty path segment, the same as `createRouteMatcher`. The names are
 * rewritten to letters because that's all the format allows, and they're never
 * read back: the destination is a fixed file.
 *
 * The rules are written without a trailing slash, so `/recipe/42` and
 * `/recipe/42/` both match. That means these hosts serve the page at both
 * addresses rather than redirecting to the canonical one, which `vite dev` and
 * the generated node servers do. Dev is stricter than the host here, not looser.
 *
 * @example
 * ```ts
 * buildRedirectsFile(['/recipe/:id/', '/user/:name/posts/'], '404.html')
 * // /recipe/:pa  /404.html  200
 * // /user/:pa/posts  /404.html  200
 * ```
 */
export function buildRedirectsFile(dynamicPatterns: string[], fallbackFileName: string): string {
	return dynamicPatterns
		.map(pattern => `${toPlaceholders(pattern)}  /${fallbackFileName}  200`)
		.join('\n')
		.concat(dynamicPatterns.length === 0 ? '' : '\n')
}

/** `/recipe/:id/` becomes `/recipe/:pa`, because the format only allows letters. */
function toPlaceholders(pattern: string): string {
	let index = 0
	const placeholders = pattern
		.split('/')
		.map(segment => segment.startsWith(':') ? `:p${letters(index++)}` : segment)
		.join('/')
	return placeholders.endsWith('/') ? placeholders.slice(0, -1) : placeholders
}

/** 0 -> a, 25 -> z, 26 -> aa. Only ever a handful in practice. */
function letters(index: number): string {
	let value = ''
	let remaining = index
	do {
		value = String.fromCharCode(97 + (remaining % 26)) + value
		remaining = Math.floor(remaining / 26) - 1
	} while (remaining >= 0)
	return value
}
