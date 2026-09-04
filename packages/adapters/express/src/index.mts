import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { routedAdapter, routedNotFound } from '@rooted/adapter'

import { expressDevelopmentServer } from './development-server.mts'

export type { ExpressMiddleware } from './middleware.mts'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

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
	 * rolldown at build time. Each file must export a default `function(app)` that
	 * registers middleware on the Express instance. Files are loaded in lexicographic
	 * order, so numeric prefixes (`01-auth.mts`, `02-proxy.mts`) control load order.
	 * Middleware runs before the rooted static-file and route handlers.
	 *
	 * The same files also run during `vite dev` and `vite preview`, on Vite's own
	 * port, so you don't need a second process to reach them. Dev loads the
	 * sources through Vite, preview runs the built `dist/middleware/*.mjs`.
	 * See the [server middleware guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/server-middleware.md).
	 *
	 * @example
	 * ```ts
	 * expressAdapter({ middlewarePath: './src/server-middleware' })
	 * ```
	 *
	 * ```ts
	 * // src/server-middleware/01-api-proxy.mts
	 * import { createMiddleware } from '@rooted-adapters/express/middleware'
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
 * Returns two plugins: the build-time adapter, and a dev-time one that runs
 * `middlewarePath` during `vite dev` and `vite preview`. Vite flattens nested
 * plugin arrays, so it still goes straight into `plugins` as one entry.
 *
 * Requires `express >= 5.0.0` in the project.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { generateRouteManifest } from '@rooted/router/manifest'
 * import { expressAdapter } from '@rooted-adapters/express/middleware'
 *
 * export default rootedManifest({
 *   plugins: [
 *     generateRouteManifest({ glob: './src/**\/_routes.mts', root: './src/_routes.g.mts' }),
 *     expressAdapter(),
 *   ],
 * })
 * ```
 */
export function expressAdapter(options?: ExpressAdapterOptions): Plugin[] {
	return [routedAdapter({
		name: 'rooted:express',
		routes: options?.routes,
		async setup({ outputDirectory, config }) {
			if (options?.middlewarePath) {
				const sourceDirectory = path.resolve(config.root, options.middlewarePath)
				const files = (await readdir(sourceDirectory)).filter(f => MIDDLEWARE_EXTENSIONS.test(f))
				if (files.length === 0)
					throw new Error(
						`[rooted:express] No middleware files (.mts, .ts, .mjs, .js) found in middlewarePath "${options.middlewarePath}"`,
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
				buildExpressTemplate(!!options?.middlewarePath),
				'utf8',
			)
		},
	}), expressDevelopmentServer(options?.middlewarePath),
	routedNotFound({ name: 'rooted:express-not-found', routes: options?.routes })]
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
const fallbackHtml = readFileSync(path.join(__dirname, fallback), 'utf8')
const app = express()
${middlewareBlock}
// Serves all pre-rendered HTML files and static assets automatically
app.use(base, express.static(__dirname))

// Parameterized routes: Express uses the same :param syntax as the rooted router
for (const route of dynamicRoutes) {
  app.get(prefix + route, (_req, res) =>
    res.status(200).type('html').send(fallbackHtml)
  )
}

// Anything else is a real 404. Navigations still get the SPA shell so the
// browser-side router can render a 404 page; everything else gets an empty
// body, because answering an image request with HTML only confuses things.
app.use((req, res) => {
  if (!(req.headers.accept ?? '').includes('text/html')) return res.status(404).end()
  res.status(404).type('html').send(fallbackHtml)
})

const port = Number(process.env.PORT ?? 3000)
app.listen(port, '0.0.0.0', () => console.log(\`Listening on http://0.0.0.0:\${port}\`))
`
}
