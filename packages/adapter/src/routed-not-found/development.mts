import { requestTarget, wantsHtml } from '../utility/request-url.mts'
import { looksLikeFile } from '../utility/route-matcher.mts'

import { redirectToCanonical, respondWithShell } from './response.mts'

import type { ResolvedConfig, ViteDevServer } from 'vite'

/**
 * The `vite dev` half of {@link routedNotFound}.
 *
 * Two middlewares, because neither position can do the whole job, and the
 * returned function is the post hook Vite installs after its own chain.
 */
export function developmentNotFound(
	config: ResolvedConfig,
	matcher: () => (pathname: string) => boolean,
) {
	return (server: ViteDevServer): (() => void) => {
		// Navigations have to be caught before Vite: its SPA fallback answers
		// 200 for any URL and never calls next(), so there is nothing left to
		// correct afterwards.
		server.middlewares.use((request, response, next) => {
			const target = requestTarget(request, config)
			if (!target || !wantsHtml(request)) return next()
			// Someone can navigate straight to a file. Whether it exists is
			// vite's business, not the route table's.
			if (looksLikeFile(target.pathname)) return next()
			if (redirectToCanonical(response, target, matcher())) return
			if (matcher()(target.pathname)) return next()

			void respondWithShell(server, config, target.url, response, next, 404)
		})

		// Everything else has to be judged after Vite, because only Vite knows
		// whether a path is one of its own: a source module, a dependency, a
		// file in public/. Reaching here means it declined to serve it.
		return () => {
			server.middlewares.use((request, response, next) => {
				const target = requestTarget(request, config)
				if (!target) return next()
				// Vite's html fallback runs before this hook and only rewrites
				// the url; indexHtmlMiddleware, which actually sends the page,
				// runs after. So navigations reach here unsent, and they were
				// already judged on the way in: leave them to it. A file is the
				// exception. It had to reach vite first, and getting here means
				// vite had nothing to serve, so it really is missing.
				if (wantsHtml(request) && !looksLikeFile(target.pathname)) return next()
				if (redirectToCanonical(response, target, matcher())) return

				// A route is a route whatever the caller asked for, the same as
				// the generated server, where the router matches before anything
				// looks at Accept.
				if (matcher()(target.pathname)) {
					return void respondWithShell(server, config, target.url, response, next, 200)
				}

				// Missing. A navigation still gets the shell to render a 404
				// page; an <img> or a fetch gets an empty body it can act on.
				if (wantsHtml(request)) {
					return void respondWithShell(server, config, target.url, response, next, 404)
				}
				response.statusCode = 404
				response.end()
			})
		}
	}
}
