import { routeManifestPluginName } from '@rooted/seo'

import { previewNotFound } from './routed-not-found/preview.mts'
import { redirectToCanonical, respondWithShell } from './routed-not-found/response.mts'
import { resolveAdapterRoutes } from './utility/adapter-routes.mts'
import { requestTarget, wantsHtml } from './utility/request-url.mts'
import { createRouteMatcher, looksLikeFile } from './utility/route-matcher.mts'

import type { AdapterRoutes } from './adapter.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin, ResolvedConfig } from 'vite'

/**
 * Options for {@link routedNotFound}.
 */
export type RoutedNotFoundOptions = {
	/** Vite plugin name, e.g. `'rooted:fastify-not-found'`. */
	name: string
	/** The adapter's manual `routes` option, merged with the route manifest. */
	routes?: AdapterRoutes
}

/**
 * Makes `vite dev` answer URLs the way the generated server does: one canonical
 * address per route, and a real 404 for anything that isn't one.
 *
 * Without this, Vite's SPA fallback hands out the shell with a 200 for any URL
 * at all, so a typo in a link looks fine in dev and 404s in production. Known
 * routes -- the static paths and `:param` patterns the manifest knows about --
 * are left alone and still render normally, and a route written without its
 * trailing slash gets a 301 to the canonical form.
 *
 * It can't tell you about content that doesn't exist, only about routes that
 * don't. `/recipe/99999/` matches `/recipe/:id/` and gets a 200 here exactly as
 * it does in the generated server; whether recipe 99999 exists is the app's
 * call, not the router's.
 */
export function routedNotFound(options: RoutedNotFoundOptions): Plugin {
	let config: ResolvedConfig
	let manifestApi: RouteManifestApi | undefined
	// A sentinel, not undefined: with no manifest plugin `routes` is undefined
	// too, and the matcher would never be built.
	let cachedFor: unknown = Symbol('unresolved')
	let matches: (pathname: string) => boolean

	// The manifest is empty until buildStart, and the manifest plugin swaps in a
	// fresh array whenever a route file is added or removed, so key the matcher
	// on that array rather than building it once.
	function matcher() {
		const routes = manifestApi?.routes
		if (routes !== cachedFor) {
			cachedFor = routes
			matches = createRouteMatcher(resolveAdapterRoutes(manifestApi, options.routes))
		}
		return matches
	}

	return {
		name: options.name,
		apply: 'serve',

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(plugin => plugin.name === routeManifestPluginName)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
		},

		configurePreviewServer(server) {
			return previewNotFound(options.name, config)(server)
		},

		configureServer(server) {
			// Two middlewares, because neither position can do the whole job.
			//
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
		},
	}
}
