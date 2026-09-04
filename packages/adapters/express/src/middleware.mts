// Deliberately free of runtime imports. This module is loaded by the built
// server and by anything else that runs a middleware file, so pulling in the
// Vite plugin (and through it @rooted/adapter and happy-dom) would be dead
// weight at startup. Keep every import in here type-only.
import type { Express } from 'express'

/**
 * An Express middleware function for use with the adapter's `middlewarePath`.
 * Receives the Express instance and may register middleware or routes on it.
 */
export type ExpressMiddleware = (app: Express) => Promise<void> | void

/**
 * Identity helper that types a middleware function for the express adapter.
 * Use it as the default export of a file under your `middlewarePath` folder so
 * editors pick up the Express instance type without extra annotations.
 *
 * It's imported from `@rooted-adapters/express/middleware` rather than the
 * package root on purpose: the root is the Vite plugin, and your middleware
 * files get run by the server, not by Vite.
 *
 * @example
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
export function createMiddleware(handler: ExpressMiddleware): ExpressMiddleware {
	return handler
}
