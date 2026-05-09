/**
 * Type-safe wrappers around the browser's `localStorage`, `sessionStorage`,
 * and cookies. Synchronous, SSR-safe, no encryption.
 *
 *
 * - [Storage guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/storage.md)
 *
 * @module
 */

export {
	cookieStorage,
	type CookieStorage,
	type CookieInit,
	type CookieSameSite,
} from '../web/cookies/cookie-storage.mts'

export {
	localStorage,
	type LocalStorage,
} from '../web/local-storage/local-storage.mts'

export {
	sessionStorage,
	type SessionStorage,
} from '../web/local-storage/session-storage.mts'
