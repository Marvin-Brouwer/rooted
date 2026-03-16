import * as href_ from './href.mts'
export type { Url, Path } from './href.mts'

/**
 * Namespace for URL and path utilities.
 *
 * Always import and use as a namespace — `href.for(route, params)`, `href.path('/...')`, etc.
 *
 * | Member | Description |
 * |--------|-------------|
 * | `href.for(route, params)` | Build a {@link Path} from a {@link Route} and its parameter values |
 * | `href.path(string)` | Construct a {@link Path} from a pathname string |
 * | `href.url(string)` | Construct a {@link Url} from a full URL string |
 * | `href.join(base, ...paths)` | Join path segments onto a base, normalising slashes |
 * | `href.current()` | Return a {@link Path} for the current `location.pathname` |
 *
 * @__PURE__
 */
export const href = {
	get url() { return href_.url },
	get path() { return href_.path },
	get join() { return href_.join },
	get current() { return href_.current },
	get for() { return href_.forAny }
} as const