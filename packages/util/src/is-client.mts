import { environment } from './environment.mts'

/**
 * Returns `true` in a real browser, `false` during the pre-render and on a server.
 *
 * Note the pre-render: it runs your bundle with a fake `window` installed, so it has a DOM but it is not a client.
 * When the question is "is there a DOM to touch", ask `environment.hasDom` instead.
 */
export function isClient(): boolean {
	return environment.is('client')
}
