import { createAdapter } from './adapter/create.mts'

import type { NodeMiddlewareServerOptions } from './node-middleware.mts'
import type { Plugin, ResolvedConfig } from 'vite'

/**
 * A flat list of route paths/patterns for adapters that don't use `generateRouteManifest`.
 * Paths without `:param` segments are pre-rendered statically (e.g. `'/categories/'`).
 * Paths with `:param` segments are registered as dynamic routes (e.g. `'/products/:id/'`).
 */
export type AdapterRoutes = string[]

/**
 * Resolved and merged route lists passed to adapter `setup` hooks via `AdapterContext`.
 */
export type ResolvedAdapterRoutes = {
	/** Static paths that have a pre-rendered `index.html` file. */
	staticPaths: string[]
	/** Dynamic route patterns in Express `:param` format. */
	dynamicPatterns: string[]
}

/**
 * Context passed to {@link StaticAdapterDefinition.setup} and {@link RoutedAdapterDefinition.setup}.
 */
export type AdapterContext = {
	/** The resolved output directory path. */
	outputDirectory: string
	/** The contents of the built `index.html`. */
	indexHtml: string
	/** The Vite resolved config. */
	config: ResolvedConfig
	/**
	 * Merged route lists from the route manifest and any manual `routes` option.
	 * Covers both manifest routes and manual ones.
	 */
	resolvedRoutes: ResolvedAdapterRoutes
}

/**
 * Definition for a file-based static host (GitHub Pages, S3, Azure Blob Storage, ...).
 * Pass to {@link staticAdapter}.
 */
export type StaticAdapterDefinition = {
	/** Vite plugin name, e.g. `'rooted:github-pages'`. */
	name: string
	/**
	 * File name for the catch-all fallback HTML file.
	 * Defaults to `'404.html'`.
	 */
	fallbackFileName?: string
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * Merged with manifest routes when both are present.
	 * Paths without `:param` are pre-rendered; paths with `:param` are dynamic.
	 */
	routes?: AdapterRoutes
	/**
	 * Called after the fallback file is written, before static routes are processed.
	 * Use this to write any additional host-specific files (e.g. `.nojekyll`).
	 */
	setup?(context: AdapterContext): Promise<void> | void
}

/**
 * Definition for a server-based host (Fastify, Express, Azure Web Apps, ...).
 * Pass to {@link routedAdapter}.
 *
 * `TApplication` is the framework instance type, and only matters if you supply
 * `createServer`.
 */
export type RoutedAdapterDefinition<TApplication = unknown> = {
	/** Vite plugin name, e.g. `'rooted:fastify'`. */
	name: string
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * Merged with manifest routes when both are present.
	 * Paths without `:param` are pre-rendered; paths with `:param` are dynamic.
	 */
	routes?: AdapterRoutes
	/**
	 * The adapter's own `middlewarePath` option, relative to the Vite project
	 * root. When set, the folder is transpiled into `<outDir>/middleware` at
	 * build time and run by `createServer` during dev and preview.
	 */
	middlewarePath?: string
	/**
	 * Builds the framework instance that runs `middlewarePath` during
	 * `vite dev` and `vite preview`. Leave it out and the middleware only runs
	 * in the generated server. See {@link nodeMiddlewareServer}.
	 */
	createServer?: NodeMiddlewareServerOptions<TApplication>['createServer']
	/**
	 * Called before static routes are processed.
	 * `context.resolvedRoutes` and the auto-written `routes.json` are both available here.
	 * Use this to generate any framework-specific server config.
	 */
	setup?(context: AdapterContext): Promise<void> | void
}

/**
 * Base adapter for static file hosts.
 *
 * Writes `index.html` to each static route directory, injects SEO metadata,
 * runs the SSG pre-render pass, and writes a catch-all fallback file (default
 * `404.html`) so the JS router can handle any URL that doesn't match a real file.
 *
 * Automatically connects to `generateRouteManifest` and the SEO plugin via
 * Vite inter-plugin communication -- no manual wiring needed.
 */
export function staticAdapter(definition: StaticAdapterDefinition): Plugin {
	return createAdapter({ ...definition, mode: 'static' })[0]
}

/**
 * Base adapter for server-based hosts.
 *
 * Does everything {@link staticAdapter} does, and also writes `routes.json` so
 * the server knows which paths have pre-rendered HTML, what the base path is,
 * and which file to serve as the SPA fallback.
 *
 * Use `setup` to generate any framework-specific routing config from
 * `context.resolvedRoutes`.
 *
 * Returns several plugins: the build-time one, the not-found handler that gives
 * `vite dev` and `vite preview` the same 404s and canonical redirects as the
 * generated server, and -- when you pass `createServer` -- the one that runs
 * `middlewarePath` on Vite's own port. Vite flattens nested plugin arrays, so
 * the result still goes straight into `plugins` as one entry.
 *
 * @example `routes.json` written automatically
 * ```json
 * {
 *   "base": "/my-app/",
 *   "staticRoutes": ["/categories/", "/privacy/"],
 *   "dynamicRoutes": ["/recipe/:id/"],
 *   "fallback": "404.html"
 * }
 * ```
 */
export function routedAdapter<TApplication = unknown>(
	definition: RoutedAdapterDefinition<TApplication>,
): Plugin[] {
	return createAdapter({ ...definition, mode: 'routed' })
}
