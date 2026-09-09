import type { ResolvedConfig } from 'vite'

/** Vite's own plumbing. None of it is an app route. */
const INTERNAL_PREFIXES = ['/@', '/node_modules/', '/__vite', '/favicon.ico']

/** What {@link requestTarget} hands back for a request worth judging. */
export type RequestTarget = {
	/** The URL as the caller wrote it, query string and all. */
	url: string
	/** The pathname with the configured base removed. */
	pathname: string
}

/** Vite ids are posix, and so are the paths chokidar reports back. */
export function toPosixPath(value: string): string {
	return value.split('\\').join('/')
}

/** A navigation, as opposed to a script, style, image or fetch. */
export function wantsHtml(request: { headers: Record<string, unknown> }): boolean {
	const accept = request.headers.accept
	return typeof accept === 'string' && accept.includes('text/html')
}

/** Strips the configured base, or returns undefined when the URL sits outside it. */
export function stripBase(pathname: string, base: string): string | undefined {
	const prefix = base.replace(/\/$/, '')
	if (prefix === '') return pathname
	if (pathname === prefix) return '/'
	if (!pathname.startsWith(`${prefix}/`)) return undefined
	return pathname.slice(prefix.length)
}

/**
 * The part of a request an adapter can have an opinion about, or undefined when
 * it has none: a write, something outside the base, or one of Vite's own URLs.
 *
 * It reads `originalUrl` in preference to `url` because Vite's SPA fallback
 * rewrites `url` to `/index.html` partway through the chain, and the address the
 * caller asked for is the one worth judging.
 */
export function requestTarget(
	request: { url?: string, originalUrl?: string, method?: string, headers: Record<string, unknown> },
	config: ResolvedConfig,
): RequestTarget | undefined {
	if (request.method !== 'GET' && request.method !== 'HEAD') return undefined
	const url = request.originalUrl ?? request.url ?? '/'
	const pathname = stripBase(url.split('?')[0].split('#')[0], config.base)
	if (pathname === undefined) return undefined
	if (INTERNAL_PREFIXES.some(prefix => pathname.startsWith(prefix))) return undefined
	return { url, pathname }
}
