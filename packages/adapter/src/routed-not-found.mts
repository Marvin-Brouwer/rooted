import { routeManifestPluginName } from '@rooted/seo'

import { developmentNotFound } from './routed-not-found/development.mts'
import { createMatcherCache } from './routed-not-found/matchers.mts'
import { previewNotFound } from './routed-not-found/preview.mts'

import type { AdapterRoutes, DynamicRouteSupport } from './adapter.mts'
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
	/**
	 * What the host does with a `:param` route. See {@link DynamicRouteSupport}.
	 * Defaults to `'routed'`.
	 */
	dynamicRoutes?: DynamicRouteSupport
}

/**
 * Makes `vite dev` and `vite preview` answer URLs the way the deployed site
 * does: one canonical address per route, and a real 404 for anything that isn't
 * one.
 *
 * Without this, Vite's SPA fallback hands out the shell with a 200 for any URL
 * at all, so a typo in a link looks fine in dev and 404s in production. Known
 * routes -- the static paths and `:param` patterns the manifest knows about --
 * are left alone and still render normally, and a route written without its
 * trailing slash gets a 301 to the canonical form.
 *
 * It can't tell you about content that doesn't exist, only about routes that
 * don't. `/recipe/99999/` matches `/recipe/:id/` and gets the same answer here
 * as it does on the host; whether recipe 99999 exists is the app's call, not
 * the router's.
 *
 * `staticAdapter` and `routedAdapter` compose this for you. Reach for it
 * directly only when you're building an adapter by hand.
 */
export function routedNotFound(options: RoutedNotFoundOptions): Plugin {
	let config: ResolvedConfig
	let manifestApi: RouteManifestApi | undefined
	const matchers = createMatcherCache(
		() => manifestApi,
		options.routes,
		options.dynamicRoutes ?? 'routed',
	)

	return {
		name: options.name,
		apply: 'serve',

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(plugin => plugin.name === routeManifestPluginName)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
		},

		configureServer(server) {
			return developmentNotFound(config, matchers)(server)
		},

		configurePreviewServer(server) {
			return previewNotFound(options.name, config)(server)
		},
	}
}
