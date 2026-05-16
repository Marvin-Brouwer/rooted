import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { routedAdapter } from '@rooted/adapter'

import type { Plugin } from 'vite'

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
export function fastifyAdapter(): Plugin {
	return routedAdapter({
		name: 'rooted:fastify',
		async setup({ outputDirectory }) {
			await writeFile(
				path.join(outputDirectory, 'server.mjs'),
				FASTIFY_SERVER_TEMPLATE,
				'utf8',
			)
		},
	})
}

const FASTIFY_SERVER_TEMPLATE = `\
import { readFileSync } from 'node:fs'
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
