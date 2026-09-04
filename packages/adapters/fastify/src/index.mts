import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { routedAdapter, routedNotFound } from '@rooted/adapter'

import { fastifyDevelopmentServer } from './development-server.mts'

export type { FastifyMiddleware } from './middleware.mts'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link fastifyAdapter}.
 */
export type FastifyAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
	/**
	 * Path to a folder of middleware files, relative to the Vite project root.
	 * Files can be `.mts`, `.ts`, `.mjs`, or `.js` -- TypeScript is transpiled with
	 * rolldown at build time. Each file must export a default `async function(app)`
	 * that registers plugins or middleware on the Fastify instance. Files are loaded
	 * in lexicographic order, so numeric prefixes (`01-auth.mts`, `02-proxy.mts`)
	 * control load order. Middleware runs before the rooted static-file and route
	 * handlers.
	 *
	 * The same files also run during `vite dev` and `vite preview`, on Vite's own
	 * port, so you don't need a second process to reach them. Dev loads the
	 * sources through Vite, preview runs the built `dist/middleware/*.mjs`.
	 * See the [server middleware guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/server-middleware.md).
	 *
	 * @example
	 * ```ts
	 * fastifyAdapter({ middlewarePath: './src/server-middleware' })
	 * ```
	 *
	 * ```ts
	 * // src/server-middleware/01-api-proxy.mts
	 * import { createMiddleware } from '@rooted-adapters/fastify/middleware'
	 * import fastifyHttpProxy from '@fastify/http-proxy'
	 *
	 * export default createMiddleware(async (app) => {
	 *   await app.register(fastifyHttpProxy, {
	 *     upstream: process.env.API_URL,
	 *     prefix: '/api',
	 *   })
	 * })
	 * ```
	 */
	middlewarePath?: string
}

/**
 * Adapter for server-side hosting with Fastify.
 *
 * Writes `routes.json` and a ready-to-run `server.mjs` to the output directory.
 * The server uses `@fastify/static` to serve pre-rendered HTML files and registers
 * explicit handlers for parameterized routes (which serve the `404.html` SPA shell
 * so the browser-side router renders the correct content).
 *
 * Users start the server with `node dist/server.mjs`. The `PORT` environment variable
 * controls the port (default: 3000).
 *
 * Returns two plugins: the build-time adapter, and a dev-time one that runs
 * `middlewarePath` during `vite dev` and `vite preview`. Vite flattens nested
 * plugin arrays, so it still goes straight into `plugins` as one entry.
 *
 * Requires `fastify >= 5.0.0` and `@fastify/static >= 8.0.0` in the project.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 * import { fastifyAdapter } from '@rooted-adapters/fastify/middleware'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     fastifyAdapter(),
 *   ],
 * })
 * ```
 */
export function fastifyAdapter(options?: FastifyAdapterOptions): Plugin[] {
	return [routedAdapter({
		name: 'rooted:fastify',
		routes: options?.routes,
		async setup({ outputDirectory, config }) {
			if (options?.middlewarePath) {
				const sourceDirectory = path.resolve(config.root, options.middlewarePath)
				const files = (await readdir(sourceDirectory)).filter(f => MIDDLEWARE_EXTENSIONS.test(f))
				if (files.length === 0)
					throw new Error(
						`[rooted:fastify] No middleware files (.mts, .ts, .mjs, .js) found in middlewarePath "${options.middlewarePath}"`,
					)
				const middlewareDirectory = path.join(outputDirectory, 'middleware')
				await mkdir(middlewareDirectory, { recursive: true })
				// Imported here so vite dev never pays for loading rolldown.
				const { build } = await import('rolldown')
				for (const file of files) {
					await build({
						input: path.join(sourceDirectory, file),
						platform: 'node',
						external: id => !id.startsWith('.') && !path.isAbsolute(id),
						logLevel: 'silent',
						output: {
							file: path.join(middlewareDirectory, file.replace(MIDDLEWARE_EXTENSIONS, '.mjs')),
							format: 'esm',
						},
					})
				}
			}
			await writeFile(
				path.join(outputDirectory, 'server.mjs'),
				buildFastifyTemplate(!!options?.middlewarePath),
				'utf8',
			)
		},
	}), fastifyDevelopmentServer(options?.middlewarePath),
	routedNotFound({ name: 'rooted:fastify-not-found', routes: options?.routes })]
}

const MIDDLEWARE_EXTENSIONS = /\.(mts|ts|mjs|js)$/

function buildFastifyTemplate(hasMiddleware: boolean): string {
	const fsImport = hasMiddleware
		? `import { readFileSync, readdirSync } from 'node:fs'`
		: `import { readFileSync } from 'node:fs'`

	const middlewareBlock = hasMiddleware
		? `
// User middleware -- applied before rooted handlers
const middlewareDir = path.join(__dirname, 'middleware')
for (const file of readdirSync(middlewareDir).filter(f => f.endsWith('.mjs')).sort()) {
  const mod = await import(path.join(middlewareDir, file))
  if (mod.default) await mod.default(app)
}
`
		: ''

	return `\
${fsImport}
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { base, dynamicRoutes, fallback } = JSON.parse(
  readFileSync(path.join(__dirname, 'routes.json'), 'utf8')
)

const prefix = base.replace(/\\/$/, '')
const fallbackHtml = readFileSync(path.join(__dirname, fallback), 'utf8')
const app = Fastify({ logger: true })
${middlewareBlock}
// Serves all pre-rendered HTML files and static assets automatically
await app.register(fastifyStatic, { root: __dirname, prefix: base })

// Parameterized routes: Fastify matches the pattern, SPA router handles content
for (const route of dynamicRoutes) {
  app.get(prefix + route, (_req, reply) =>
    reply.code(200).type('text/html').send(fallbackHtml)
  )
}

// Anything else is a real 404. Navigations still get the SPA shell so the
// browser-side router can render a 404 page; everything else gets an empty
// body, because answering an image request with HTML only confuses things.
app.setNotFoundHandler((request, reply) => {
  if (!(request.headers.accept ?? '').includes('text/html'))
    return reply.code(404).send()
  return reply.code(404).type('text/html').send(fallbackHtml)
})

await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
`
}
