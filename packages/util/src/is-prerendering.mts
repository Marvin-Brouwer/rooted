import { environment } from './environment.mts'

/**
 * Returns `true` while the build pre-renders a static route.
 *
 * The pre-render boots your app in happy-dom to snapshot its HTML. Most of the DOM works,
 * some of it doesn't: computed style comes back empty, layout is never measured, and nothing paints.
 * This is the check for skipping the parts that need a real browser.
 *
 * Detected by finding happy-dom, so a test suite running in the happy-dom environment answers `true` here as well.
 */
export function isPrerendering(): boolean {
	return environment.is('preRenderer')
}
