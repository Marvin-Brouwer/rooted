import * as href_ from './href.mts'
export type { Url, Path } from './href.mts'

/**
 * Unified Url and Path method. \
 * This may seem overkill, but, this ensures consistency between urls and paths
 *
 * This file specifically exists for exporting from the module, users are required to use `href.url()` notation.
 */

// TODO doc

/** @__PURE__ */
export const href = {
	get url() { return href_.url },
	get path() { return href_.path },
	get join() { return href_.join },
	get current() { return href_.current },
	get for() { return href_.forAny }
} as const