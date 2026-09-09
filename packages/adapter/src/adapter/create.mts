import { nodeMiddlewareServer } from '../node-middleware.mts'
import { routedNotFound } from '../routed-not-found.mts'

import { buildPlugin } from './build.mts'

import type { AdapterContext, AdapterRoutes, DynamicRouteSupport } from '../adapter.mts'
import type { NodeMiddlewareServerOptions } from '../node-middleware.mts'
import type { Plugin } from 'vite'

/** The union of both public definitions, plus which of the two it came from. */
export type InternalDefinition<TApplication> = {
	name: string
	mode: 'static' | 'routed'
	dynamicRoutes: DynamicRouteSupport
	fallbackFileName?: string
	routes?: AdapterRoutes
	middlewarePath?: string
	createServer?: NodeMiddlewareServerOptions<TApplication>['createServer']
	setup?(context: AdapterContext): Promise<void> | void
}

/**
 * Assembles the plugins an adapter is made of, so every adapter gets the same
 * dev and preview behaviour without wiring it up itself.
 *
 * The order matters and mirrors the generated server: the user's middleware
 * runs first, then the not-found handler, so an `/api` route the middleware
 * owns is never answered by the SPA fallback.
 */
export function createAdapter<TApplication>(definition: InternalDefinition<TApplication>): Plugin[] {
	const plugins: Plugin[] = [buildPlugin(definition)]

	if (definition.createServer) {
		plugins.push(nodeMiddlewareServer<TApplication>({
			name: `${definition.name}-dev`,
			middlewarePath: definition.middlewarePath,
			createServer: definition.createServer,
		}))
	}

	plugins.push(routedNotFound({
		name: `${definition.name}-not-found`,
		routes: definition.routes,
		dynamicRoutes: definition.dynamicRoutes,
	}))

	return plugins
}
