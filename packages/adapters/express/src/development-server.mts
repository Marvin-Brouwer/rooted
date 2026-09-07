import type { NodeMiddlewareHandler } from '@rooted/adapter'
import type { Express } from 'express'
import type { Connect } from 'vite'

/**
 * Builds the Express instance that runs the `middlewarePath` files during
 * `vite dev` and `vite preview`. Anything Express has no route for falls back
 * to Vite.
 */
export async function createExpressServer(
	middleware: ReadonlyArray<(app: Express) => Promise<void>>,
): Promise<NodeMiddlewareHandler> {
	const { default: express } = await import('express')
	const app = express()

	for (const register of middleware) await register(app)

	// An Express app is already a connect handler. Handed a third
	// argument its router calls that instead of sending its own 404, so
	// unmatched paths fall through. The cast is because the types only
	// declare the two-argument form.
	return { handle: app as unknown as Connect.NextHandleFunction }
}
