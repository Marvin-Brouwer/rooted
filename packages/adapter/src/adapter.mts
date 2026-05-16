import { access, constants, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createStaticRenderer, injectSnapshot } from './static-renderer.mts'

import type { SeoApi } from './seo-api.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'
import type { Plugin, ResolvedConfig } from 'vite'

const MANIFEST_PLUGIN_NAME = 'vite-plugin:generate-rooted-route-manifest'
const SEO_PLUGIN_NAME = 'rooted:seo'

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
	 * Route manifest API. Use this to iterate static routes and generate
	 * host-specific artifacts (e.g. a server route config).
	 */
	manifestApi: RouteManifestApi | undefined
	/**
	 * SEO plugin API. Use this to inject meta tags, retrieve the sitemap URL,
	 * or register additional sitemaps from within the adapter's `setup` hook.
	 */
	seoApi: SeoApi | undefined
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
	 * Called after the fallback file is written, before static routes are processed.
	 * Use this to write any additional host-specific files (e.g. `.nojekyll`).
	 */
	setup?(context: AdapterContext): Promise<void> | void
}

/**
 * Definition for a server-based host (Fastify, Express, Azure Web Apps, ...).
 * Pass to {@link routedAdapter}.
 */
export type RoutedAdapterDefinition = {
	/** Vite plugin name, e.g. `'rooted:fastify'`. */
	name: string
	/**
	 * Called before static routes are processed.
	 * `context.manifestApi` and the auto-written `routes.json` are both available here.
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
	return createAdapter(definition, 'static')
}

/**
 * Base adapter for server-based hosts.
 *
 * Does everything {@link staticAdapter} does except writing a fallback file.
 * Instead, writes `routes.json` so the server knows which paths have pre-rendered
 * HTML, what the base path is, and which file to serve as the SPA fallback.
 *
 * Use `setup` to generate any framework-specific routing config from
 * `context.manifestApi`.
 *
 * @example `routes.json` written automatically
 * ```json
 * {
 *   "base": "/my-app/",
 *   "staticRoutes": ["/categories/", "/privacy/"],
 *   "fallback": "index.html"
 * }
 * ```
 */
export function routedAdapter(definition: RoutedAdapterDefinition): Plugin {
	return createAdapter(definition, 'routed')
}

// ---------------------------------------------------------------------------

type InternalDefinition = {
	name: string
	fallbackFileName?: string
	setup?(context: AdapterContext): Promise<void> | void
}

function createAdapter(definition: InternalDefinition, mode: 'static' | 'routed'): Plugin {
	let config: ResolvedConfig
	let manifestApi: RouteManifestApi | undefined
	let seoApi: SeoApi | undefined

	return {
		name: definition.name,
		apply: 'build',

		configResolved(resolved) {
			config = resolved
			const manifestPlugin = resolved.plugins.find(p => p.name === MANIFEST_PLUGIN_NAME)
			manifestApi = (manifestPlugin as { api?: RouteManifestApi } | undefined)?.api
			const seoPlugin = resolved.plugins.find(p => p.name === SEO_PLUGIN_NAME)
			seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
		},

		async closeBundle() {
			const outputDirectory = config.build.outDir
			const indexHtmlPath = path.join(outputDirectory, 'index.html')

			// Skip environments that don't produce index.html (e.g. the SW environment from VitePWA)
			if (!await checkFileExists(indexHtmlPath)) return
			const indexHtml = await readFile(indexHtmlPath, 'utf8')

			if (mode === 'static') {
				const fallbackFileName = definition.fallbackFileName ?? '404.html'
				// Fallback handles dynamic routes -- leave it as a plain shell so the JS router
				// can handle any URL. Never inject pre-rendered content here.
				await writeFile(path.join(outputDirectory, fallbackFileName), indexHtml, 'utf8')
			}
			else {
				// Write 404.html as the SPA shell fallback -- same as staticAdapter, captured
				// before root SEO is applied to index.html so crawlers don't get root-page
				// metadata for dynamic or unknown routes.
				await writeFile(path.join(outputDirectory, '404.html'), indexHtml, 'utf8')
				// Write a routing manifest so the server knows which dynamic route patterns
				// exist, the base path, and which file to serve as the SPA catch-all fallback.
				const dynamicRoutePatterns = collectDynamicRoutePatterns(manifestApi)
				await writeFile(
					path.join(outputDirectory, 'routes.json'),
					JSON.stringify({ base: config.base, dynamicRoutes: dynamicRoutePatterns, fallback: '404.html' }, undefined, 2),
					'utf8',
				)
			}

			await definition.setup?.({ outputDirectory, indexHtml, config, manifestApi, seoApi })

			// Inject root-level SEO (JSON-LD, canonical, og:url/type/image) into index.html
			const rootHtml = seoApi ? seoApi.injectRootHtml(indexHtml) : indexHtml
			if (rootHtml !== indexHtml) {
				await writeFile(indexHtmlPath, rootHtml, 'utf8')
			}

			const staticRoutes: Array<{ staticPath: string, routeDirectory: string }> = []

			for (const route of manifestApi?.routes ?? []) {
				if (!Object.hasOwn(route, 'getMetadata')) continue

				const metadata = route.getMetadata()
				const staticPath = metadata.staticRoute
				if (staticPath === false) continue

				const segments = staticPath.split('/').filter(Boolean)
				if (segments.length === 0) continue

				const routeDirectory = path.join(outputDirectory, ...segments)
				await mkdir(routeDirectory, { recursive: true })

				const html = seoApi
					? seoApi.injectRouteHtml(indexHtml, metadata.seo, staticPath)
					: indexHtml
				await writeFile(path.join(routeDirectory, 'index.html'), html, 'utf8')
				staticRoutes.push({ staticPath, routeDirectory })
			}

			// SSG pre-render pass -- boot the app once in happy-dom, navigate to each
			// static route, and inject the resulting body HTML into the shell files
			const renderer = await createStaticRenderer(config, outputDirectory)
				.catch((error: unknown) => {
					config.logger.warn(`[static-renderer] Setup error: ${String(error)}`)
				})

			if (renderer) {
				for (const { staticPath, routeDirectory } of staticRoutes) {
					const snapshot = await renderer.render(staticPath)
					if (!snapshot) continue

					const htmlPath = path.join(routeDirectory, 'index.html')
					const html = await readFile(htmlPath, 'utf8')
					await writeFile(htmlPath, injectSnapshot(html, snapshot), 'utf8')
				}
				await renderer.dispose()
			}
		},
	}
}

function collectDynamicRoutePatterns(manifestApi: RouteManifestApi | undefined): string[] {
	const patterns: string[] = []
	for (const route of manifestApi?.routes ?? []) {
		if (!Object.hasOwn(route, 'getMetadata')) continue
		const metadata = route.getMetadata()
		if (metadata.staticRoute !== false) continue
		if (metadata.hasErrors) continue
		patterns.push(buildRoutePattern(route))
	}
	return patterns
}

// Builds a URL pattern string from a route's parts using :key for parameters.
// Wildcard tokens also use :key -- the catch-all handler covers segments they miss.
// Builds a URL pattern string from a route's parts using :key for parameters.
// Wildcard tokens also use :key -- the catch-all handler covers segments they miss.
function buildRoutePattern(route: RouteManifestApi['routes'][number]): string {
	let pattern = ''
	for (const part of route.getMetadata().routeParts) {
		if (typeof part === 'string') {
			pattern += part
		} else if (Object.hasOwn(part, 'getMetadata')) {
			pattern += buildRoutePattern(part as RouteManifestApi['routes'][number])
		} else {
			// Parameter token -- always has a `key` property
			pattern += `:${(part as { key: string }).key}`
		}
	}
	return pattern
}

async function checkFileExists(filePath: string): Promise<boolean> {
	return await access(filePath, constants.F_OK)
		.then(() => true)
		.catch(() => false)
}
