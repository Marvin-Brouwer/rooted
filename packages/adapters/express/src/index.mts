import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { build } from 'esbuild'

import { routedAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Express } from 'express'
import type { Plugin } from 'vite'

/**
 * An Express middleware function for use with {@link ExpressAdapterOptions.middlewarePath}.
 * Receives the Express instance and may register middleware or routes on it.
 */
export type ExpressMiddleware = (app: Express) => Promise<void> | void

/**
 * Identity helper that types a middleware function for the express adapter.
 * Use it as the default export of a file under your `middlewarePath` folder so
 * editors pick up the Express instance type without extra annotations.
 *
 * @example
 * ```ts
 * // src/server-middleware/01-api-proxy.mts
 * import { createMiddleware } from '@rooted-adapters/express'
 * import { createProxyMiddleware } from 'http-proxy-middleware'
 *
 * export default createMiddleware((app) => {
 *   app.use('/api', createProxyMiddleware({ target: process.env.API_URL }))
 * })
 * ```
 */
export function createMiddleware(handler: ExpressMiddleware): ExpressMiddleware {
	return handler
}

/**
 * Options for {@link expressAdapter}.
 */
export type ExpressAdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
	/**
	 * Path to a folder of middleware files, relative to the Vite project root.
	 * Files can be `.mts`, `.ts`, `.mjs`, or `.js` -- TypeScript is transpiled with
	 * esbuild at build time. Each file must export a default `function(app)` that
	 * registers middleware on the Express instance. Files are loaded in lexicographic
	 * order, so numeric prefixes (`01-auth.mts`, `02-proxy.mts`) control load order.
	 * Middleware runs before the rooted static-file and route handlers.
	 *
	 * @example
	 * ```ts
	 * expressAdapter({ middlewarePath: './src/server-middleware' })
	 * ```
	 *
	 * ```ts
	 * // src/server-middleware/01-api-proxy.mts
	 * import { createMiddleware } from '@rooted-adapters/express'
	 * import { createProxyMiddleware } from 'http-proxy-middleware'
	 *
	 * export default createMiddleware((app) => {
	 *   app.use('/api', createProxyMiddleware({ target: process.env.API_URL }))
	 * })
	 * ```
	 */
	middlewarePath?: string
}

/**
 * Adapter for server-side hosting with Express.
 *
 * Writes `routes.json` and a ready-to-run `server.mjs` to the output directory.
 * The server uses `express.static` to serve pre-rendered HTML files and registers
 * explicit handlers for parameterized routes (which serve the `404.html` SPA shell
 * so the browser-side router renders the correct content). Express uses the same
 * `:param` syntax as the rooted router, so patterns map directly.
 *
 * Users start the server with `node dist/server.mjs`. The `PORT` environment variable
 * controls the port (default: 3000).
 *
 * Requires `express >= 5.0.0` in the project.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 * import { expressAdapter } from '@rooted-adapters/express'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     expressAdapter(),
 *   ],
 * })
 * ```
 */
export function expressAdapter(options?: ExpressAdapterOptions): Plugin {
	return routedAdapter({
		name: 'rooted:express',
		routes: options?.routes,
		async setup({ outputDirectory }) {
			if (options?.middlewarePath) {
				const sourceDirectory = path.resolve(process.cwd(), options.middlewarePath)
				const files = (await readdir(sourceDirectory)).filter(f => MIDDLEWARE_EXTENSIONS.test(f))
				if (files.length === 0)
					throw new Error(
						`[rooted:express] No middleware files (.mts, .ts, .mjs, .js) found in middlewarePath "${options.middlewarePath}"`,
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
				buildExpressTemplate(!!options?.middlewarePath),
				'utf8',
			)
		},
	})
}

const MIDDLEWARE_EXTENSIONS = /\.(mts|ts|mjs|js)$/

function buildExpressTemplate(hasMiddleware: boolean): string {
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
import express from 'express'
${fsImport}
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { base, dynamicRoutes, fallback } = JSON.parse(
  readFileSync(path.join(__dirname, 'routes.json'), 'utf8')
)

const prefix = base.replace(/\\/$/, '')
const app = express()
${middlewareBlock}
// Serves all pre-rendered HTML files and static assets automatically
app.use(base, express.static(__dirname))

// Parameterized routes: Express uses the same :param syntax as the rooted router
for (const route of dynamicRoutes) {
  app.get(prefix + route, (_req, res) =>
    res.sendFile(path.join(__dirname, fallback))
  )
}

// Anything else: SPA shell (browser-side router shows the correct content or 404)
app.use((_req, res) => res.sendFile(path.join(__dirname, fallback)))

const port = Number(process.env.PORT ?? 3000)
app.listen(port, '0.0.0.0', () => console.log(\`Listening on http://0.0.0.0:\${port}\`))
`
}
