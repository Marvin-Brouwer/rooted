import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { build } from 'esbuild'

import { routedAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { FastifyInstance } from 'fastify'
import type { Plugin } from 'vite'

/**
 * A Fastify middleware function for use with {@link FastifyAdapterOptions.middlewarePath}.
 * Receives the Fastify instance and may register plugins, hooks, or routes on it.
 */
export type FastifyMiddleware = (app: FastifyInstance) => Promise<void> | void

/**
 * Identity helper that types a middleware function for the fastify adapter.
 * Use it as the default export of a file under your `middlewarePath` folder so
 * editors pick up the Fastify instance type without extra annotations.
 *
 * @example
 * ```ts
 * // src/server-middleware/01-api-proxy.mts
 * import { createMiddleware } from '@rooted-adapters/fastify'
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
export function createMiddleware(handler: FastifyMiddleware): FastifyMiddleware {
	return handler
}

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
	 * esbuild at build time. Each file must export a default `async function(app)`
	 * that registers plugins or middleware on the Fastify instance. Files are loaded
	 * in lexicographic order, so numeric prefixes (`01-auth.mts`, `02-proxy.mts`)
	 * control load order. Middleware runs before the rooted static-file and route
	 * handlers.
	 *
	 * @example
	 * ```ts
	 * fastifyAdapter({ middlewarePath: './src/server-middleware' })
	 * ```
	 *
	 * ```ts
	 * // src/server-middleware/01-api-proxy.mts
	 * import { createMiddleware } from '@rooted-adapters/fastify'
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
 * Requires `fastify >= 5.0.0` and `@fastify/static >= 8.0.0` in the project.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 * import { fastifyAdapter } from '@rooted-adapters/fastify'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     fastifyAdapter(),
 *   ],
 * })
 * ```
 */
export function fastifyAdapter(options?: FastifyAdapterOptions): Plugin {
	return routedAdapter({
		name: 'rooted:fastify',
		routes: options?.routes,
		async setup({ outputDirectory }) {
			if (options?.middlewarePath) {
				const sourceDirectory = path.resolve(process.cwd(), options.middlewarePath)
				const files = (await readdir(sourceDirectory)).filter(f => MIDDLEWARE_EXTENSIONS.test(f))
				if (files.length === 0)
					throw new Error(
						`[rooted:fastify] No middleware files (.mts, .ts, .mjs, .js) found in middlewarePath "${options.middlewarePath}"`,
					)
				const middlewareDirectory = path.join(outputDirectory, 'middleware')
				await mkdir(middlewareDirectory, { recursive: true })
				for (const file of files) {
					await build({
						entryPoints: [path.join(sourceDirectory, file)],
						outfile: path.join(middlewareDirectory, file.replace(MIDDLEWARE_EXTENSIONS, '.mjs')),
						bundle: true,
						platform: 'node',
						format: 'esm',
						target: 'node22',
						packages: 'external',
						logLevel: 'silent',
					})
				}
			}
			await writeFile(
				path.join(outputDirectory, 'server.mjs'),
				buildFastifyTemplate(!!options?.middlewarePath),
				'utf8',
			)
		},
	})
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
const app = Fastify({ logger: true })
${middlewareBlock}
// Serves all pre-rendered HTML files and static assets automatically
await app.register(fastifyStatic, { root: __dirname, prefix: base })

// Parameterized routes: Fastify matches the pattern, SPA router handles content
for (const route of dynamicRoutes) {
  app.get(prefix + route, (_req, reply) =>
    reply.type('text/html').sendFile(fallback, __dirname)
  )
}

// Anything else: SPA shell (browser-side router shows the correct content or 404)
app.setNotFoundHandler((_req, reply) =>
  reply.type('text/html').sendFile(fallback, __dirname)
)

await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
`
}
