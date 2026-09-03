import { nodeMiddlewareServer } from '@rooted/adapter'

import type { FastifyInstance } from 'fastify'
import type { IncomingMessage } from 'node:http'
import type { Connect, Plugin } from 'vite'

// Keyed on the raw request so defaultRoute can find the connect `next` that
// belongs to the request it's looking at.
const pendingNext = new WeakMap<IncomingMessage, Connect.NextFunction>()

/**
 * Serves the `middlewarePath` files during `vite dev` and `vite preview`.
 * Anything Fastify has no route for falls back to Vite.
 */
export function fastifyDevelopmentServer(middlewarePath: string | undefined): Plugin {
	return nodeMiddlewareServer<FastifyInstance>({
		name: 'rooted:fastify-dev',
		middlewarePath,
		async createServer(middleware) {
			const { default: Fastify } = await import('fastify')

			const app = Fastify({
				// The generated server logs; here pino's JSON would interleave
				// with Vite's own output and neither would be readable.
				logger: false,
				routerOptions: {
					// Fires straight from the router, before the not-found
					// lifecycle, so nothing has been written to the response and
					// the body is still unread when Vite picks the request up.
					defaultRoute: (request, response) => {
						const next = pendingNext.get(request)
						pendingNext.delete(request)
						if (next) next()
						else response.end()
					},
				},
			})

			for (const { register } of middleware) await register(app)
			// Routes added with app.register() don't exist until this resolves,
			// and app.routing() isn't safe to call before it either.
			await app.ready()

			return {
				handle(request, response, next) {
					pendingNext.set(request, next)
					app.routing(request, response)
				},
				close: () => app.close(),
			}
		},
	})
}
