import { environment } from './environment.mts'

/**
 * Returns `true` while the build pre-renders a static route.
 *
 * The pre-render boots your app in happy-dom to snapshot its HTML. Most of the DOM works,
 * some of it doesn't: computed style comes back empty, layout is never measured, and nothing paints.
 * This is the check for skipping the parts that need a real browser.
 */
export function isPrerendering(): boolean {
	return environment.is('preRenderer')
}
