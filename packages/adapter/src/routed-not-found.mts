import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { resolveAdapterRoutes } from './adapter.mts'

import type { AdapterRoutes } from './adapter.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Connect, Plugin, ResolvedConfig, ViteDevServer } from 'vite'

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'

/** Vite's own plumbing. None of it is an app route. */
const INTERNAL_PREFIXES = ['/@', '/node_modules/', '/__vite', '/favicon.ico']

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
 * Makes `vite dev` answer unknown URLs the way the generated server does:
 * a real 404, with the app shell for navigations and an empty body for
 * everything else.
 *
 * Without this, Vite's SPA fallback hands out the shell with a 200 for any URL
 * at all, so a typo in a link looks fine in dev and 404s in production. Known
 * routes -- the static paths and `:param` patterns the manifest knows about --
 * are left alone and still render normally.
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
			const manifestPlugin = resolved.plugins.find(plugin => plugin.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
		},

		configureServer(server) {
			// Two middlewares, because neither position can do the whole job.
			//
			// Navigations have to be caught before Vite: its SPA fallback answers
			// 200 for any URL and never calls next(), so there is nothing left to
			// correct afterwards.
			server.middlewares.use((request, response, next) => {
				const target = routeOf(request, config)
				if (!target || !wantsHtml(request)) return next()
				// Someone can navigate straight to a file. Whether it exists is
				// vite's business, not the route table's.
				if (looksLikeFile(target.pathname)) return next()
				if (redirect(response, target, matcher())) return
				if (matcher()(target.pathname)) return next()

				void respond(server, config, target.url, response, next, 404)
			})

			// Everything else has to be judged after Vite, because only Vite knows
			// whether a path is one of its own: a source module, a dependency, a
			// file in public/. Reaching here means it declined to serve it.
			return () => {
				server.middlewares.use((request, response, next) => {
					const target = routeOf(request, config)
					if (!target) return next()
					// Vite installs its SPA fallback after this hook, not before, so
					// navigations have not been served yet. They were already judged
					// on the way in; leave them to it. A file is the exception: it
					// had to reach vite first, and getting here means vite had
					// nothing to serve, so it really is missing.
					if (wantsHtml(request) && !looksLikeFile(target.pathname)) return next()
					if (redirect(response, target, matcher())) return

					// A route is a route whatever the caller asked for, the same as
					// the generated server, where the router matches before anything
					// looks at Accept.
					if (matcher()(target.pathname)) return void respond(server, config, target.url, response, next, 200)

					// Missing. A navigation still gets the shell to render a 404
					// page; an <img> or a fetch gets an empty body it can act on.
					if (wantsHtml(request)) return void respond(server, config, target.url, response, next, 404)
					response.statusCode = 404
					response.end()
				})
			}
		},
	}
}

// ---------------------------------------------------------------------------

/**
 * Sends the canonical slash form when the URL is a route written without one.
 * Only real routes redirect, so a vite module id or a file is never touched.
 */
function redirect(
	response: Parameters<Connect.NextHandleFunction>[1],
	target: { url: string, pathname: string },
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

async function respond(
	server: ViteDevServer,
	config: ResolvedConfig,
	url: string,
	response: Parameters<Connect.NextHandleFunction>[1],
	next: Connect.NextFunction,
	status: number,
) {
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

/** The request's in-base pathname, or undefined when it isn't ours to answer. */
function routeOf(
	request: { url?: string, originalUrl?: string, method?: string, headers: Record<string, unknown> },
	config: ResolvedConfig,
): { url: string, pathname: string } | undefined {
	if (request.method !== 'GET' && request.method !== 'HEAD') return undefined
	// Vite's SPA fallback rewrites `url` to /index.html before the post hook
	// runs, so judge the address the caller actually asked for.
	const url = request.originalUrl ?? request.url ?? '/'
	const pathname = stripBase(url.split('?')[0].split('#')[0], config.base)
	if (pathname === undefined) return undefined
	if (INTERNAL_PREFIXES.some(prefix => pathname.startsWith(prefix))) return undefined
	return { url, pathname }
}

/**
 * Builds a matcher with the same semantics as the generated servers: a `:param`
 * matches exactly one non-empty segment, and the path is compared as written.
 * Kept deliberately in step with the matcher in the generated `server.mjs`.
 */
function createRouteMatcher(routes: { staticPaths: string[], dynamicPatterns: string[] }) {
	const staticPaths = new Set(['/', ...routes.staticPaths.map(withTrailingSlash)])
	const dynamicPatterns = routes.dynamicPatterns.map(pattern => withTrailingSlash(pattern).split('/'))

	return (pathname: string) => {
		if (staticPaths.has(pathname)) return true
		const parts = pathname.split('/')
		return dynamicPatterns.some(pattern =>
			pattern.length === parts.length
			&& pattern.every((segment, index) => segment.startsWith(':') ? parts[index] !== '' : segment === parts[index]),
		)
	}
}

function withTrailingSlash(value: string): string {
	return value.endsWith('/') ? value : `${value}/`
}

/** A path whose last segment carries an extension is a file, not a route. */
function looksLikeFile(pathname: string): boolean {
	return (pathname.split('/').pop() ?? '').includes('.')
}

/** Returns undefined when the URL sits outside the configured base. */
function stripBase(pathname: string, base: string): string | undefined {
	const prefix = base.replace(/\/$/, '')
	if (prefix === '') return pathname
	if (pathname === prefix) return '/'
	if (!pathname.startsWith(`${prefix}/`)) return undefined
	return pathname.slice(prefix.length)
}

/** A navigation, as opposed to a script, style, image or fetch. */
function wantsHtml(request: { headers: Record<string, unknown> }): boolean {
	const accept = request.headers.accept
	return typeof accept === 'string' && accept.includes('text/html')
}
