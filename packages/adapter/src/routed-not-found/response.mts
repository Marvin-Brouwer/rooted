import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { looksLikeFile } from '../utility/route-matcher.mts'

import type { RequestTarget } from '../utility/request-url.mts'
import type { Connect, ResolvedConfig, ViteDevServer } from 'vite'

type ServerResponse = Parameters<Connect.NextHandleFunction>[1]

/**
 * Sends the canonical slash form when the URL is a route written without one.
 * Only real routes redirect, so a vite module id or a file is never touched.
 *
 * Returns whether it answered.
 */
export function redirectToCanonical(
	response: ServerResponse,
	target: RequestTarget,
	matches: (pathname: string) => boolean,
): boolean {
	if (target.pathname.endsWith('/') || looksLikeFile(target.pathname)) return false
	if (!matches(`${target.pathname}/`)) return false

	const [pathname, search] = target.url.split('?')
	response.statusCode = 301
	response.setHeader('Location', `${pathname}/${search ? `?${search}` : ''}`)
	response.end()
	return true
}

/**
 * Answers with the app shell at the given status, transformed the way Vite
 * would have transformed it, so the browser-side router can render the page.
 */
export async function respondWithShell(
	server: ViteDevServer,
	config: ResolvedConfig,
	url: string,
	response: ServerResponse,
	next: Connect.NextFunction,
	status: number,
): Promise<void> {
	try {
		const shell = await readFile(path.join(config.root, 'index.html'), 'utf8')
		const html = await server.transformIndexHtml(url, shell)
		response.statusCode = status
		response.setHeader('Content-Type', 'text/html; charset=utf-8')
		response.end(html)
	}
	catch (error) {
		// Better to fall through to Vite than to take the page down over this.
		next(error)
	}
}
