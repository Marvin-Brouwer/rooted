import { baseUrl } from '@rooted/util'
import { isDevelopment } from '@rooted/util/dev'

/** A scheme (`https:`) or a protocol-relative prefix (`//host`). */
const outsideOriginPattern = /^[a-z][\w+.-]*:|^\/\//i
/** A `..` segment anywhere in the path. */
const traversalPattern = /(^|\/)\.\.(\/|$)/

/**
 * The app root as a cookie `Path`: {@link baseUrl} without its trailing slash.
 * `/my-repo/` becomes `/my-repo`, and `/` stays `/`.
 *
 * A base that isn't a path on this origin falls back to `/`. Vite allows a
 * relative base (`./`) and a full CDN URL, and neither says anything about
 * where the app is served from, so there's nothing better to guess.
 */
export function appBasePath(): string {
	const base = baseUrl()
	if (!base.startsWith('/') || base.startsWith('//')) return '/'

	return base.length > 1 ? base.replace(/\/$/, '') : '/'
}

/**
 * Resolves the `path` a caller passed to `cookieStorage` into an absolute
 * cookie `Path` inside the app, the way `@rooted/router` resolves an href.
 *
 * `'/settings'`, `'settings'` and `'./settings'` all come out as
 * `<app base>/settings`, and a path that already carries the base doesn't get
 * a second copy of it. Nothing at all means the app root.
 *
 * A path that points outside the app (`https://...`, `//host`, or anything
 * with a `..` segment) can't be scoped to this app. It throws in development
 * so you see it, and falls back to the app root in production so one bad path
 * doesn't take the page down.
 *
 * @example
 * ```ts
 * // app served from /my-repo/
 * resolveCookiePath(undefined)   // '/my-repo'
 * resolveCookiePath('/')         // '/my-repo'
 * resolveCookiePath('/settings') // '/my-repo/settings'
 * resolveCookiePath('settings')  // '/my-repo/settings'
 * ```
 */
export function resolveCookiePath(path: string | null | undefined): string {
	const base = appBasePath()
	// `null` counts as unset, the same way `buildCookieString` reads it.
	if (path == undefined || path.length === 0) return base
	if (outsideOriginPattern.test(path) || traversalPattern.test(path)) return rejectPath(path, base)

	const relativePath = path
		.replace(/^\.?\//, '')
		.replace(/\/$/, '')
	if (relativePath.length === 0) return base
	if (base === '/') return '/' + relativePath

	// Compare whole segments, so a base of `/my-repo` doesn't swallow `/my-repository`.
	const baseSegment = base.slice(1)
	if (relativePath === baseSegment || relativePath.startsWith(baseSegment + '/')) return '/' + relativePath

	return base + '/' + relativePath
}

function rejectPath(path: string, base: string): string {
	if (isDevelopment()) {
		throw new TypeError(
			`[@rooted/storage] Cookie path "${path}" points outside the app. `
			+ `Pass a path inside it, like "/settings" or "settings", or leave it off to use "${base}".`,
		)
	}

	return base
}
