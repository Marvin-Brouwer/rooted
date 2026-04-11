/**
 * Storage utilities for web APIs
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
