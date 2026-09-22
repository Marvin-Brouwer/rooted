import { environment } from './environment.mts'

/**
 * Returns `true` in Node with no DOM around, so not a browser and not the pre-render either.
 *
 * That's a plain server process or a test running under the node environment.
 */
export function isServer(): boolean {
	return environment.is('server')
}
