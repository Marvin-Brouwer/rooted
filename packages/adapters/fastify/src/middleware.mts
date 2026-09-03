// Deliberately free of runtime imports. This module is loaded by the built
// server and by anything else that runs a middleware file, so pulling in the
// Vite plugin (and through it @rooted/adapter and happy-dom) would be dead
// weight at startup. Keep every import in here type-only.
import type { FastifyInstance } from 'fastify'

/**
 * A Fastify middleware function for use with the adapter's `middlewarePath`.
 * Receives the Fastify instance and may register plugins, hooks, or routes on it.
 */
export type FastifyMiddleware = (app: FastifyInstance) => Promise<void> | void

/**
 * Identity helper that types a middleware function for the fastify adapter.
 * Use it as the default export of a file under your `middlewarePath` folder so
 * editors pick up the Fastify instance type without extra annotations.
 *
 * It's imported from `@rooted-adapters/fastify/middleware` rather than the
 * package root on purpose: the root is the Vite plugin, and your middleware
 * files get run by the server, not by Vite.
 *
 * @example
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
export function createMiddleware(handler: FastifyMiddleware): FastifyMiddleware {
	return handler
}
