import { nodeMiddlewareServer } from '@rooted/adapter'

import type { Express } from 'express'
import type { Connect, Plugin } from 'vite'

/**
 * Serves the `middlewarePath` files during `vite dev` and `vite preview`.
 * Anything Express has no route for falls back to Vite.
 */
export function expressDevelopmentServer(middlewarePath: string | undefined): Plugin {
	return nodeMiddlewareServer<Express>({
		name: 'rooted:express-dev',
		middlewarePath,
		async createServer(middleware) {
			const { default: express } = await import('express')
			const app = express()

			for (const { register } of middleware) await register(app)

			// An Express app is already a connect handler. Handed a third
			// argument its router calls that instead of sending its own 404, so
			// unmatched paths fall through. The cast is because the types only
			// declare the two-argument form.
			return { handle: app as unknown as Connect.NextHandleFunction }
		},
	})
}
