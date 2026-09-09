import { readFileSync } from 'node:fs'
import path from 'node:path'

import { requestTarget, wantsHtml } from '../utility/request-url.mts'

import { createMatchers } from './matchers.mts'
import { redirectToCanonical } from './response.mts'

import type { Connect, PreviewServer, ResolvedConfig } from 'vite'

type ServerResponse = Parameters<Connect.NextHandleFunction>[1]

/** The shape an adapter writes to `routes.json`. */
type RouteTable = {
	base: string
	staticRoutes: string[]
	dynamicRoutes: string[]
	fallback: string
	/** What the host answers for a matched dynamic route. Older builds have no field. */
	dynamicStatus?: 200 | 404
}

/**
 * The preview half of {@link routedNotFound}.
 *
 * Preview has no module runner and no `transformIndexHtml`, so it answers from
 * the same two files the generated server answers from: `routes.json` and the
 * fallback shell beside it. That makes it a closer copy of production than dev
 * can be, not a worse one.
 *
 * One middleware, registered from the post hook. Vite installs its static and
 * html-fallback middlewares before that hook and only sends the html after it,
 * so by the time this runs the real files are already served and nothing has
 * answered yet. Registering before the hook instead would 404 real assets
 * before Vite got a chance to serve them.
 */
export function previewNotFound(name: string, config: ResolvedConfig) {
	return (server: PreviewServer): (() => void) => () => {
		const outputDirectory = path.resolve(config.root, config.environments.client.build.outDir)

		const table = readRouteTable(outputDirectory)
		if (!table) {
			// Nothing built to preview. Leave the server exactly as Vite had it
			// rather than 404ing every page over a missing file.
			config.logger.warn(`[${name}] no routes.json in "${outputDirectory}", so preview answers as plain vite would`)
			return
		}

		const matchers = createMatchers(
			{ staticPaths: table.staticRoutes, dynamicPatterns: table.dynamicRoutes },
			table.dynamicStatus === 404 ? 'fallback' : 'routed',
		)

		server.middlewares.use((request, response, next) => {
			const target = requestTarget(request, config)
			if (!target) return next()
			if (redirectToCanonical(response, target, matchers.shouldRedirect)) return

			// Vite's html fallback already pointed this at the prerendered file.
			if (matchers.isStatic(target.pathname)) return next()
			// A dynamic route. The generated server sends the fallback shell here
			// rather than index.html, so the root page's SEO doesn't leak onto it.
			if (matchers.isRoute(target.pathname)) return send(response, matchers.dynamicStatus, table.html)

			// Not a route, and Vite already declined it. A navigation still gets
			// the shell so the browser-side router can render a 404 page; an
			// <img> or a fetch gets an empty body it can act on.
			if (!wantsHtml(request)) {
				response.statusCode = 404
				response.end()
				return
			}
			send(response, 404, table.html)
		})
	}
}

function readRouteTable(outputDirectory: string): (RouteTable & { html: string }) | undefined {
	try {
		const table = JSON.parse(
			readFileSync(path.join(outputDirectory, 'routes.json'), 'utf8'),
		) as RouteTable
		return { ...table, html: readFileSync(path.join(outputDirectory, table.fallback), 'utf8') }
	}
	catch {
		return undefined
	}
}

function send(response: ServerResponse, status: number, html: string) {
	response.statusCode = status
	response.setHeader('Content-Type', 'text/html; charset=utf-8')
	response.end(html)
}
